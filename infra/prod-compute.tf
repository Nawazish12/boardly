# Production ECS cluster + t3.micro instance (reuses shared AMI/subnet data sources).
resource "aws_ecs_cluster" "prod" {
  name = "${var.project}-prod"
}

locals {
  prod_user_data = <<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.prod.name}" >> /etc/ecs/ecs.config
    dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
  EOF
}

resource "aws_instance" "prod" {
  ami                         = data.aws_ssm_parameter.ecs_ami.value
  instance_type               = "t3.micro"
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.prod_instance.id]
  iam_instance_profile        = aws_iam_instance_profile.prod_ec2.name
  associate_public_ip_address = true
  user_data                   = local.prod_user_data

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = { Name = "${var.project}-prod" }
}
