output "compute_shape" {
  description = "Compute shape used for fe-vm and api-vm."
  value       = var.compute_shape
}

output "compartment_id" {
  description = "Compartment OCID used by this environment."
  value       = local.compartment_id
}

output "vcn_id" {
  description = "VCN OCID."
  value       = module.vcn.vcn_id
}

output "fe_vm_public_ip" {
  description = "Public IP of fe-vm (nginx + frontend)."
  value       = module.fe_vm.public_ip
}

output "fe_vm_private_ip" {
  description = "Private IP of fe-vm."
  value       = module.fe_vm.private_ip
}

output "api_vm_public_ip" {
  description = "Public IP of api-vm (SSH admin only; API port 8080 is not exposed to the internet)."
  value       = module.api_vm.public_ip
}

output "api_vm_private_ip" {
  description = "Private IP of api-vm (used by fe-vm nginx proxy)."
  value       = module.api_vm.private_ip
}

output "availability_domain" {
  description = "Availability domain used for compute instances."
  value       = local.availability_domain
}
