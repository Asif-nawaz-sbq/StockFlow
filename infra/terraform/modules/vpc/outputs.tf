output "vpc_id" {
  description = "VPC id."
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "VPC CIDR, for security group rules."
  value       = aws_vpc.this.cidr_block
}

output "availability_zones" {
  description = "AZs the subnets were placed in."
  value       = local.azs
}

output "public_subnet_ids" {
  description = "Public subnet ids, for the load balancer."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet ids, for ECS tasks, RDS and ElastiCache."
  value       = aws_subnet.private[*].id
}

output "nat_gateway_public_ips" {
  description = "Elastic IPs of the NAT gateways, for supplier IP allowlists."
  value       = aws_eip.nat[*].public_ip
}

output "nat_gateway_enabled" {
  description = "Whether private subnets currently have outbound internet access."
  value       = var.enable_nat_gateway
}
