output "compute_shape" {
  description = "Compute shape used for the app VM."
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
  description = "Public IP of app-vm (nginx + frontend + backend on localhost)."
  value       = module.fe_vm.public_ip
}

output "fe_vm_private_ip" {
  description = "Private IP of app-vm."
  value       = module.fe_vm.private_ip
}

output "availability_domain" {
  description = "Availability domain used for compute instances."
  value       = local.availability_domain
}
