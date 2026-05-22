# ===========================================================================
# Backend ALB — CloudFront's "/api/*" origin. HTTP only (CloudFront does HTTPS).
# Targets are registered automatically by the ECS service (built next).
# ===========================================================================

resource "aws_lb" "staging" {
  name               = "${var.project}-staging-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.staging_alb.id]
  # ALB needs subnets in >= 2 AZs (default VPC has one subnet per AZ).
  subnets = data.aws_subnets.default.ids
}

resource "aws_lb_target_group" "staging_backend" {
  name        = "${var.project}-staging-be-tg"
  port        = 5000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "instance" # ECS EC2 bridge networking + dynamic host ports

  health_check {
    path                = "/health" # backend's health endpoint
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "staging_http" {
  load_balancer_arn = aws_lb.staging.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.staging_backend.arn
  }
}
