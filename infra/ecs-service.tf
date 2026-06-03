# ===========================================================================
# Staging ECS task definition + service.
# One task with 3 containers: backend (API) + worker (BullMQ) + redis.
# Backend is wired into the ALB target group; secrets come from SSM via valueFrom.
# ===========================================================================

variable "backend_image_tag" {
  description = "Backend image tag in ECR to run (e.g. the git short SHA)."
  type        = string
}

resource "aws_cloudwatch_log_group" "staging" {
  name              = "/ecs/${var.project}-staging"
  retention_in_days = 7
}

locals {
  ssm_prefix    = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/staging"
  backend_image = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"

  # Non-secret runtime config (DEPLOYMENT.md §5: env block, not SSM).
  app_env = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "5000" },
    { name = "REDIS_URL", value = "redis://redis:6379" },
    { name = "APP_URL", value = "https://staging.leadisa.com" },
    { name = "ACCESS_TOKEN_EXPIRES_IN", value = "15m" },
    { name = "REFRESH_TOKEN_EXPIRES_IN", value = "7d" },
    { name = "SUPER_ADMIN_NAME", value = "Super Admin" },
    { name = "SUPER_ADMIN_EMAIL", value = "superadmin@example.com" },
    { name = "SUPER_ADMIN_PASSWORD", value = "SuperAdmin123" },
    { name = "EMAIL_FROM", value = "onboarding@resend.dev" },
  ]

  # Secrets injected by ECS from SSM (DEPLOYMENT.md §5: valueFrom, never plaintext).
  app_secrets = [
    { name = "MONGODB_URI", valueFrom = "${local.ssm_prefix}/MONGODB_URI" },
    { name = "JWT_SECRET", valueFrom = "${local.ssm_prefix}/JWT_SECRET" },
    { name = "JWT_REFRESH_SECRET", valueFrom = "${local.ssm_prefix}/JWT_REFRESH_SECRET" },
    { name = "RESEND_API_KEY", valueFrom = "${local.ssm_prefix}/RESEND_API_KEY" },
  ]

  log_options = {
    "awslogs-group"  = "/ecs/${var.project}-staging"
    "awslogs-region" = var.region
  }
}

resource "aws_ecs_task_definition" "staging" {
  family             = "${var.project}-staging"
  network_mode       = "bridge"
  execution_role_arn = aws_iam_role.staging_task_execution.arn
  task_role_arn      = aws_iam_role.staging_task.arn

  container_definitions = jsonencode([
    {
      name              = "redis"
      image             = "redis:7-alpine"
      essential         = true
      command           = ["redis-server", "--appendonly", "yes"]
      memoryReservation = 96
      logConfiguration  = { logDriver = "awslogs", options = merge(local.log_options, { "awslogs-stream-prefix" = "redis" }) }
    },
    {
      name              = "backend"
      image             = local.backend_image
      essential         = true
      memoryReservation = 300
      links             = ["redis"]
      portMappings      = [{ containerPort = 5000, hostPort = 0, protocol = "tcp" }]
      environment       = local.app_env
      secrets           = local.app_secrets
      logConfiguration  = { logDriver = "awslogs", options = merge(local.log_options, { "awslogs-stream-prefix" = "backend" }) }
    },
    {
      name              = "worker"
      image             = local.backend_image
      essential         = false # a worker crash shouldn't take down the API
      memoryReservation = 200
      command           = ["node", "src/worker.js"]
      links             = ["redis"]
      environment       = local.app_env
      secrets           = local.app_secrets
      logConfiguration  = { logDriver = "awslogs", options = merge(local.log_options, { "awslogs-stream-prefix" = "worker" }) }
    },
  ])
}

resource "aws_ecs_service" "staging" {
  name            = "${var.project}-staging"
  cluster         = aws_ecs_cluster.staging.id
  task_definition = aws_ecs_task_definition.staging.arn
  desired_count   = 1
  launch_type     = "EC2"

  # 1GB box can't run old+new simultaneously: stop old, then start new (brief downtime).
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  # Backend connects to Mongo/Redis on boot — give it time before health checks fail it.
  health_check_grace_period_seconds = 90

  load_balancer {
    target_group_arn = aws_lb_target_group.staging_backend.arn
    container_name   = "backend"
    container_port   = 5000
  }

  # Terraform sets the service up once; the CI/CD pipeline rolls out new task-def
  # revisions (new image per commit). Ignore those so Terraform doesn't revert deploys.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.staging_http]
}
