# Production ECS task definition + service (backend + worker + redis).
resource "aws_cloudwatch_log_group" "prod" {
  name              = "/ecs/${var.project}-prod"
  retention_in_days = 7
}

locals {
  prod_ssm_prefix    = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/prod"
  prod_backend_image = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"

  prod_app_env = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "5000" },
    { name = "REDIS_URL", value = "redis://redis:6379" },
    { name = "APP_URL", value = "https://${aws_cloudfront_distribution.prod.domain_name}" },
    { name = "ACCESS_TOKEN_EXPIRES_IN", value = "15m" },
    { name = "REFRESH_TOKEN_EXPIRES_IN", value = "7d" },
    { name = "SUPER_ADMIN_NAME", value = "Super Admin" },
    { name = "SUPER_ADMIN_EMAIL", value = "superadmin@example.com" },
    { name = "SUPER_ADMIN_PASSWORD", value = "SuperAdmin123" },
    { name = "EMAIL_FROM", value = "onboarding@resend.dev" },
  ]

  prod_app_secrets = [
    { name = "MONGODB_URI", valueFrom = "${local.prod_ssm_prefix}/MONGODB_URI" },
    { name = "JWT_SECRET", valueFrom = "${local.prod_ssm_prefix}/JWT_SECRET" },
    { name = "JWT_REFRESH_SECRET", valueFrom = "${local.prod_ssm_prefix}/JWT_REFRESH_SECRET" },
    { name = "RESEND_API_KEY", valueFrom = "${local.prod_ssm_prefix}/RESEND_API_KEY" },
  ]

  prod_log_options = {
    "awslogs-group"  = "/ecs/${var.project}-prod"
    "awslogs-region" = var.region
  }
}

resource "aws_ecs_task_definition" "prod" {
  family             = "${var.project}-prod"
  network_mode       = "bridge"
  execution_role_arn = aws_iam_role.prod_task_execution.arn
  task_role_arn      = aws_iam_role.prod_task.arn

  container_definitions = jsonencode([
    {
      name              = "redis"
      image             = "redis:7-alpine"
      essential         = true
      command           = ["redis-server", "--appendonly", "yes"]
      memoryReservation = 96
      logConfiguration  = { logDriver = "awslogs", options = merge(local.prod_log_options, { "awslogs-stream-prefix" = "redis" }) }
    },
    {
      name              = "backend"
      image             = local.prod_backend_image
      essential         = true
      memoryReservation = 300
      links             = ["redis"]
      portMappings      = [{ containerPort = 5000, hostPort = 0, protocol = "tcp" }]
      environment       = local.prod_app_env
      secrets           = local.prod_app_secrets
      logConfiguration  = { logDriver = "awslogs", options = merge(local.prod_log_options, { "awslogs-stream-prefix" = "backend" }) }
    },
    {
      name              = "worker"
      image             = local.prod_backend_image
      essential         = false
      memoryReservation = 200
      command           = ["node", "src/worker.js"]
      links             = ["redis"]
      environment       = local.prod_app_env
      secrets           = local.prod_app_secrets
      logConfiguration  = { logDriver = "awslogs", options = merge(local.prod_log_options, { "awslogs-stream-prefix" = "worker" }) }
    },
  ])
}

resource "aws_ecs_service" "prod" {
  name            = "${var.project}-prod"
  cluster         = aws_ecs_cluster.prod.id
  task_definition = aws_ecs_task_definition.prod.arn
  desired_count   = 1
  launch_type     = "EC2"

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  health_check_grace_period_seconds  = 90

  load_balancer {
    target_group_arn = aws_lb_target_group.prod_backend.arn
    container_name   = "backend"
    container_port   = 5000
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.prod_http]
}
