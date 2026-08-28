# Terraform 初級環境（OCI Always Free）

[VS-07](https://github.com/rikuto-web/recipe-app/issues/28) / [システム構成 §3, §5](../../../docs/07-architecture.md) に基づき、fe-vm + api-vm のネットワークと Compute をコード化します。

## 作成されるリソース

| リソース | 内容 |
| --- | --- |
| Compartment | `beginner-recipe-app`（既存 compartment を指定すれば作成しない） |
| VCN | `10.0.0.0/16`、Internet Gateway、パブリックサブネット |
| fe-vm | Ampere A1 Flex（既定 1 OCPU / 3 GB）または **E2.1.Micro**（x86 / ~1 GB） |
| api-vm | 同上 |
| NSG | fe: 80/443 公開、22 は管理者 IP のみ / api: 8080 は fe-nsg からのみ、22 は管理者 IP のみ |

## 手動で必要な作業（Terraform では完結しない）

OCI アカウント作成とログインは完了している前提です。以下は **コンソールまたはローカル CLI で一度だけ** 行います。

| 手順 | 理由 |
| --- | --- |
| **API 署名キーの作成** | Identity → ユーザー → API キー → 公開鍵を追加。秘密鍵は `~/.oci/oci_api_key.pem` 等に保存 |
| **OCID の控え** | Tenancy OCID、User OCID、Fingerprint を `terraform.tfvars` に記入 |
| **SSH 鍵ペア** | `ssh-keygen -t ed25519` 等。公開鍵を `ssh_public_key` に、秘密鍵は SSH 接続用 |
| **管理者 IP の確認** | `admin_cidr` に自分のグローバル IP `/32` を設定（SSH 用 NSG） |
| **リージョン選定** | Ampere A1 の在庫があるリージョン（例: `ap-tokyo-1`）。在庫不足時は AD やリージョン変更 |

Terraform **以前** に上記を済ませ、`terraform.tfvars` を用意してください。

## Terraform で完結する部分

```bash
cd infra/terraform/environments/beginner
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集

terraform init
terraform plan
terraform apply
```

| 項目 | Terraform |
| --- | --- |
| Compartment / VCN / Subnet / IGW / Route Table | ✓ |
| Compute Instance（fe-vm, api-vm） | ✓ |
| NSG とセキュリティルール | ✓ |
| SSH 鍵のインスタンス注入（metadata） | ✓ |
| OCI アカウント作成 | ✗ |
| API 署名キー生成 | ✗ |
| nginx / Node / Rust のインストール | ✗（apply 後の SSH 作業） |
| アプリのビルド・デプロイ | ✗ |
| systemd 有効化 | ✗ |

**結論:** インフラの骨格（ネットワーク + VM + NSG）は Terraform で再現できます。アプリ配置と nginx 設定は [デプロイフロー §6](../../../docs/07-architecture.md#6-デプロイフロー概要) のとおり apply 後に SSH で行います。

## apply 後の確認

```bash
terraform output fe_vm_public_ip
terraform output api_vm_private_ip
ssh -i ~/.ssh/id_ed25519 opc@<fe_vm_public_ip>
```

Oracle Linux のデフォルトユーザーは `opc` です。

## 中級へ移行するとき

Always Free の OCPU / メモリ枠を空けるため、初級を削除してから中級を apply します。

```bash
terraform destroy
cd ../intermediate   # 将来追加
terraform apply
```

## リージョン変更（在庫不足時）

`region` で VCN / VM の置き場所を変えられます。**事前に OCI コンソールでリージョンを購読**してください。

1. OCI Console → **Administration** → **Region management**
2. `ap-tokyo-1` や `ap-seoul-1` 等を **Subscribe**
3. `terraform.tfvars` の `region` を変更
4. 大阪で作った VCN がある場合は `terraform destroy -var='region=ap-osaka-1'` 後に apply

| 変数 | 意味 |
| --- | --- |
| `home_region` | テナンシーのホームリージョン（Identity API）。通常 `ap-osaka-1` のまま |
| `region` | VCN / VM を置くリージョン |
| `compartment_ocid` | 既存 Compartment を使う場合に指定（リージョン共通） |

未購読のリージョンで apply すると **401 NotAuthenticated** になります。

## 注意

- `terraform.tfvars` と `*.tfstate` はコミットしない（`.gitignore` 済み）
- Always Free 合計 **2 OCPU / 12 GB**（Ampere A1 Flex）または **x86 Micro 最大2台**（別枠・各 ~1 GB）
- Ampere 在庫不足時は `compute_shape = "VM.Standard.E2.1.Micro"`（完全無料・x86 枠）
