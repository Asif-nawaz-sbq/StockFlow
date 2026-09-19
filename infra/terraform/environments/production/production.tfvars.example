# Copy to production.tfvars and adjust. Real tfvars files are gitignored.
project     = "stockflow"
environment = "production"
region      = "eu-central-1"
owner       = "Asad"

vpc_cidr = "10.30.0.0/16"
az_count = 2

# Off until the ECS services exist. Roughly EUR 32/month once enabled.
enable_nat_gateway = false
single_nat_gateway = true
enable_flow_logs   = true

# --- Application layer -------------------------------------------------
# Everything below costs money. Turn on together with enable_nat_gateway.
deploy_application = false

api_image_tag = "latest"
web_image_tag = "latest"

db_instance_class      = "db.t4g.small"
db_multi_az            = true
db_deletion_protection = false
db_skip_final_snapshot = true

redis_node_type     = "cache.t4g.micro"
redis_replica_count = 1

api_cpu               = 512
api_memory            = 1024
web_cpu               = 512
web_memory            = 1024
service_desired_count = 2
autoscaling_min       = 2
autoscaling_max       = 6

certificate_arn = null

# alarm_email = "you@example.com"
