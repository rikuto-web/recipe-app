locals {
  compartment_id = var.compartment_ocid != "" ? var.compartment_ocid : oci_identity_compartment.beginner[0].id
}

resource "oci_identity_compartment" "beginner" {
  count    = var.compartment_ocid == "" ? 1 : 0
  provider = oci.home

  compartment_id = var.tenancy_ocid
  description    = "Recipe app beginner environment"
  name           = "${var.project_prefix}-recipe-app"
  enable_delete  = true
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = local.compartment_id
}

locals {
  availability_domain = var.availability_domain != "" ? var.availability_domain : data.oci_identity_availability_domains.ads.availability_domains[0].name
}

data "oci_core_images" "oracle_linux" {
  compartment_id           = local.compartment_id
  operating_system         = "Oracle Linux"
  operating_system_version = "8"
  shape                    = var.compute_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

module "vcn" {
  source = "../../modules/vcn"

  compartment_id      = local.compartment_id
  display_name_prefix = var.project_prefix
  vcn_cidr            = var.vcn_cidr
  subnet_cidr         = var.subnet_cidr
  dns_label           = var.dns_label
}

module "fe_vm" {
  source = "../../modules/compute"

  compartment_id      = local.compartment_id
  availability_domain = local.availability_domain
  subnet_id           = module.vcn.subnet_id
  display_name        = "${var.project_prefix}-app-vm"
  shape               = var.compute_shape
  image_id            = data.oci_core_images.oracle_linux.images[0].id
  ssh_public_key      = var.ssh_public_key
  nsg_ids             = [oci_core_network_security_group.fe.id]
  ocpus               = var.fe_ocpus
  memory_in_gbs       = var.fe_memory_in_gbs
}
