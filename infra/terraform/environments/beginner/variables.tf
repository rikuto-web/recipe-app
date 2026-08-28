variable "tenancy_ocid" {
  description = "OCID of the OCI tenancy."
  type        = string
}

variable "user_ocid" {
  description = "OCID of the OCI user for Terraform API access."
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the API signing key."
  type        = string
}

variable "private_key_path" {
  description = "Path to the PEM private key used for API authentication."
  type        = string
}

variable "home_region" {
  description = "Tenancy home region for Identity API (Compartment 作成等). 通常は登録時のリージョン。"
  type        = string
  default     = "ap-osaka-1"
}

variable "region" {
  description = "OCI region where VCN / Compute are created (e.g. ap-seoul-1)."
  type        = string
}

variable "compartment_ocid" {
  description = "Existing compartment OCID. Leave empty to create a dedicated beginner compartment."
  type        = string
  default     = ""
}

variable "project_prefix" {
  description = "Prefix for resource display names."
  type        = string
  default     = "beginner"
}

variable "vcn_cidr" {
  description = "CIDR block for the VCN."
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block for the public subnet."
  type        = string
  default     = "10.0.0.0/24"
}

variable "dns_label" {
  description = "DNS label for the VCN."
  type        = string
  default     = "recipebeg"
}

variable "admin_cidr" {
  description = "Source CIDR allowed to SSH into both VMs (typically your public IP /32)."
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key for opc/ubuntu user login."
  type        = string
}

variable "availability_domain" {
  description = "Availability domain name. Leave empty to use the first AD in the region."
  type        = string
  default     = ""
}

variable "compute_shape" {
  description = "Always Free: VM.Standard.E2.1.Micro (x86, 2台まで). Ampere: VM.Standard.A1.Flex."
  type        = string
  default     = "VM.Standard.E2.1.Micro"
}

variable "fe_ocpus" {
  description = "OCPUs for fe-vm when using a Flex shape (ignored for E2.1.Micro)."
  type        = number
  default     = 1
}

variable "fe_memory_in_gbs" {
  description = "Memory in GB for fe-vm when using a Flex shape (ignored for E2.1.Micro)."
  type        = number
  default     = 3
}

variable "api_ocpus" {
  description = "OCPUs for api-vm when using a Flex shape (ignored for E2.1.Micro)."
  type        = number
  default     = 1
}

variable "api_memory_in_gbs" {
  description = "Memory in GB for api-vm when using a Flex shape (ignored for E2.1.Micro)."
  type        = number
  default     = 3
}
