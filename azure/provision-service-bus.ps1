param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$ResourceGroupName,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Location,

  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[a-zA-Z0-9-]{6,50}$")]
  [string]$NamespaceName,

  [ValidateNotNullOrEmpty()]
  [string]$QueueName = "academic-messages-queue",

  [ValidateNotNullOrEmpty()]
  [string]$SenderPolicyName = "kenneth-sender-send",

  [ValidateNotNullOrEmpty()]
  [string]$ReceiverPolicyName = "ivan-receiver-listen",

  [switch]$CreateResourceGroup
)

$ErrorActionPreference = "Stop"

# Este script prepara recursos de Azure Service Bus sin imprimir cadenas SAS.
# Requiere una sesion autorizada previamente con Azure CLI: az login

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI no esta instalado o no esta disponible en PATH."
}

function Invoke-AzCli {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $output = & az @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI devolvio error al ejecutar: az $($Arguments -join ' ')"
  }

  return $output
}

function Test-AzCli {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $output = & az @Arguments 2>$null
  return @{
    Success = $LASTEXITCODE -eq 0
    Output = $output
  }
}

try {
  Invoke-AzCli -Arguments @("account", "show", "--only-show-errors", "--output", "none") | Out-Null
} catch {
  throw "No hay una sesion activa de Azure CLI. Ejecute az login antes de usar este script."
}

if ($CreateResourceGroup) {
  $groupExists = Invoke-AzCli -Arguments @("group", "exists", "--name", $ResourceGroupName, "--only-show-errors") | ConvertFrom-Json
  if (-not $groupExists) {
    Invoke-AzCli -Arguments @(
      "group", "create",
      "--name", $ResourceGroupName,
      "--location", $Location,
      "--only-show-errors",
      "--output", "none"
    ) | Out-Null
  }
}

$namespaceExists = Invoke-AzCli -Arguments @(
  "servicebus", "namespace", "exists",
  "--name", $NamespaceName,
  "--only-show-errors"
) | ConvertFrom-Json

if (-not $namespaceExists) {
  Invoke-AzCli -Arguments @(
    "servicebus", "namespace", "create",
    "--resource-group", $ResourceGroupName,
    "--name", $NamespaceName,
    "--location", $Location,
    "--sku", "Standard",
    "--only-show-errors",
    "--output", "none"
  ) | Out-Null
}

$queue = Test-AzCli -Arguments @(
  "servicebus", "queue", "show",
  "--resource-group", $ResourceGroupName,
  "--namespace-name", $NamespaceName,
  "--name", $QueueName,
  "--only-show-errors",
  "--output", "json"
)

if (-not $queue.Success) {
  Invoke-AzCli -Arguments @(
    "servicebus", "queue", "create",
    "--resource-group", $ResourceGroupName,
    "--namespace-name", $NamespaceName,
    "--name", $QueueName,
    "--only-show-errors",
    "--output", "none"
  ) | Out-Null
}

$senderRule = Test-AzCli -Arguments @(
  "servicebus", "queue", "authorization-rule", "show",
  "--resource-group", $ResourceGroupName,
  "--namespace-name", $NamespaceName,
  "--queue-name", $QueueName,
  "--name", $SenderPolicyName,
  "--only-show-errors",
  "--output", "json"
)

if ($senderRule.Success) {
  $rights = @((($senderRule.Output | ConvertFrom-Json).rights))
  if ($rights.Count -ne 1 -or $rights[0] -ne "Send") {
    throw "La politica $SenderPolicyName ya existe, pero no tiene unicamente el permiso Send. Revise manualmente antes de continuar."
  }
} else {
  Invoke-AzCli -Arguments @(
    "servicebus", "queue", "authorization-rule", "create",
    "--resource-group", $ResourceGroupName,
    "--namespace-name", $NamespaceName,
    "--queue-name", $QueueName,
    "--name", $SenderPolicyName,
    "--rights", "Send",
    "--only-show-errors",
    "--output", "none"
  ) | Out-Null
}

$receiverRule = Test-AzCli -Arguments @(
  "servicebus", "queue", "authorization-rule", "show",
  "--resource-group", $ResourceGroupName,
  "--namespace-name", $NamespaceName,
  "--queue-name", $QueueName,
  "--name", $ReceiverPolicyName,
  "--only-show-errors",
  "--output", "json"
)

if ($receiverRule.Success) {
  $rights = @((($receiverRule.Output | ConvertFrom-Json).rights))
  if ($rights.Count -ne 1 -or $rights[0] -ne "Listen") {
    throw "La politica $ReceiverPolicyName ya existe, pero no tiene unicamente el permiso Listen. Revise manualmente antes de continuar."
  }
} else {
  Invoke-AzCli -Arguments @(
    "servicebus", "queue", "authorization-rule", "create",
    "--resource-group", $ResourceGroupName,
    "--namespace-name", $NamespaceName,
    "--queue-name", $QueueName,
    "--name", $ReceiverPolicyName,
    "--rights", "Listen",
    "--only-show-errors",
    "--output", "none"
  ) | Out-Null
}

Write-Host "Recursos verificados o creados sin imprimir cadenas SAS."
Write-Host "Namespace: $NamespaceName"
Write-Host "Cola: $QueueName"
Write-Host "Politica emisor: $SenderPolicyName (Send)"
Write-Host "Politica receptor: $ReceiverPolicyName (Listen)"
Write-Host "Obtenga las cadenas de conexion desde Azure Portal o Azure CLI en una terminal segura, sin copiarlas al repositorio."
