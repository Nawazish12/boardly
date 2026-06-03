# ===========================================================================
# ECS cluster (EC2 launch type) + the t3.micro container instance for staging.
# ===========================================================================

resource "aws_ecs_cluster" "staging" {
  name = "${var.project}-staging"
}

# Default subnets in the default VPC (one is used for the instance; the ALB
# later needs two across AZs).
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Latest ECS-optimized Amazon Linux 2023 AMI (AWS publishes it as an SSM param).
data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id"
}

# Boot script: join the ECS cluster + add swap (1 GB RAM is tight for our stack).
locals {
  staging_user_data = <<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.staging.name}" >> /etc/ecs/ecs.config
    # 2 GB swap so backend + worker + redis don't OOM on a 1 GB box.
    dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
  EOF
}

resource "aws_instance" "staging" {
  ami                         = data.aws_ssm_parameter.ecs_ami.value
  instance_type               = "t3.micro"
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.staging_instance.id]
  iam_instance_profile        = aws_iam_instance_profile.staging_ec2.name
  associate_public_ip_address = true # public subnet, no NAT — needs this for egress
  user_data                   = local.staging_user_data

  # Keep root volume small (free tier = 30 GB EBS total).
  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = { Name = "${var.project}-staging" }
}
