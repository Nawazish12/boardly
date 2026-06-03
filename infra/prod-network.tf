# Production security groups (separate from staging for real env isolation).
resource "aws_security_group" "prod_alb" {
  name        = "${var.project}-prod-alb-sg"
  description = "Prod backend ALB: allow HTTP in (CloudFront is the HTTPS front door)"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP from CloudFront (TODO restrict to CloudFront prefix list)"
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
  tags = { Name = "${var.project}-prod-alb-sg" }
}

resource "aws_security_group" "prod_instance" {
  name        = "${var.project}-prod-instance-sg"
  description = "Prod ECS instance: only the ALB may reach app ports; no SSH"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "From the ALB only (ECS dynamic host ports)"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.prod_alb.id]
  }
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-prod-instance-sg" }
}
