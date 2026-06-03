# The account's default VPC already provides public subnets across AZs (which the
# ALB needs). For a $0 learning project we use it rather than building a custom VPC.
data "aws_vpc" "default" {
  default = true
}

# ---------------------------------------------------------------------------
# Backend ALB security group — the only thing exposed to the internet.
# (CloudFront is the real front door; we harden this to CloudFront-only later.)
# ---------------------------------------------------------------------------
resource "aws_security_group" "staging_alb" {
  name        = "${var.project}-staging-alb-sg"
  description = "Staging backend ALB: allow HTTPS in"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP from CloudFront (CloudFront serves HTTPS to users; TODO restrict to CloudFront prefix list)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-staging-alb-sg" }
}

# ---------------------------------------------------------------------------
# ECS instance security group — app ports reachable ONLY from the ALB.
# No port 22: shell access is via SSM Session Manager, not SSH (DEPLOYMENT.md §4).
# ---------------------------------------------------------------------------
resource "aws_security_group" "staging_instance" {
  name        = "${var.project}-staging-instance-sg"
  description = "Staging ECS instance: only the ALB may reach app ports; no SSH"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "From the ALB only (covers ECS dynamic host ports)"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.staging_alb.id]
  }

  egress {
    description = "All outbound (pull ECR images, reach Atlas/Resend/SSM)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-staging-instance-sg" }
}
