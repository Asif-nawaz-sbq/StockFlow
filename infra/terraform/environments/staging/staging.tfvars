project     = "stockflow"
environment = "staging"
region      = "eu-central-1"
owner       = "Asad"

vpc_cidr = "10.20.0.0/16"
az_count = 2

# Billable from here down.
enable_nat_gateway = false
single_nat_gateway = true
enable_flow_logs   = false

deploy_application = false

api_image_tag = "seedfix"
web_image_tag = "fix-dist"

db_instance_class = "db.t4g.micro"
db_multi_az       = false

redis_node_type     = "cache.t4g.micro"
redis_replica_count = 0

api_cpu               = 512
api_memory            = 1024
web_cpu               = 256
web_memory            = 512
service_desired_count = 1
autoscaling_min       = 1
autoscaling_max       = 3

# No domain, so the load balancer serves HTTP on its AWS DNS name.
certificate_arn = null

github_owner = "asadbashir7755"
github_repo  = "stockflow"
