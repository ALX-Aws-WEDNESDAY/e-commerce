# ============================================================
# security/04_idc/main.tf
#
# Creates the kiro_users group and three IDC users, then adds
# each user to the group.
#
# Security best practices applied:
#   - Users are created with no password set here; IDC sends
#     an email invite so credentials never pass through state.
#   - display_name follows "FirstName LastName" convention so
#     audit logs are human-readable.
#   - Users are added to the group via a separate membership
#     resource — group membership is the only way to grant
#     permission sets, never directly to a user.
#   - prevent_destroy on the group guards against accidental
#     removal of the access boundary for all three users.
# ============================================================

locals {
  instance_arn      = "arn:aws:sso:::instance/ssoins-72235cdf6174cdf1"
  identity_store_id = "d-9066759a5a"
}

# ---- Group ------------------------------------------------------------------

resource "aws_identitystore_group" "kiro_users" {
  identity_store_id = local.identity_store_id
  display_name      = "kiro_users"
  description       = "IDC group for Kiro project users."

  lifecycle {
    prevent_destroy = true
  }
}

# ---- Users ------------------------------------------------------------------

resource "aws_identitystore_user" "george_shinrai" {
  identity_store_id = local.identity_store_id

  user_name    = "george_shinrai"
  display_name = "George Shinrai"

  name {
    given_name  = "George"
    family_name = "Shinrai"
  }

  emails {
    value   = var.email_george
    primary = true
  }
}

resource "aws_identitystore_user" "kinyanjui_shinrai" {
  identity_store_id = local.identity_store_id

  user_name    = "kinyanjui_shinrai"
  display_name = "Kinyanjui Shinrai"

  name {
    given_name  = "Kinyanjui"
    family_name = "Shinrai"
  }

  emails {
    value   = var.email_kinyanjui
    primary = true
  }
}

resource "aws_identitystore_user" "ayana_shinrai" {
  identity_store_id = local.identity_store_id

  user_name    = "ayana_shinrai"
  display_name = "Ayana Shinrai"

  name {
    given_name  = "Ayana"
    family_name = "Shinrai"
  }

  emails {
    value   = var.email_ayana
    primary = true
  }
}

# ---- Group memberships ------------------------------------------------------

resource "aws_identitystore_group_membership" "george" {
  identity_store_id = local.identity_store_id
  group_id          = aws_identitystore_group.kiro_users.group_id
  member_id         = aws_identitystore_user.george_shinrai.user_id
}

resource "aws_identitystore_group_membership" "kinyanjui" {
  identity_store_id = local.identity_store_id
  group_id          = aws_identitystore_group.kiro_users.group_id
  member_id         = aws_identitystore_user.kinyanjui_shinrai.user_id
}

resource "aws_identitystore_group_membership" "ayana" {
  identity_store_id = local.identity_store_id
  group_id          = aws_identitystore_group.kiro_users.group_id
  member_id         = aws_identitystore_user.ayana_shinrai.user_id
}
