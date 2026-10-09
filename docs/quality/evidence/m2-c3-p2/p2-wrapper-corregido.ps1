# Preparación local exclusivamente. No ejecuta P2 real, no lee credenciales y no abre SQL/SSH.
param(
  [ValidateSet('diagnostico', 'ensayo-local')]
  [string]$Modo = 'ensayo-local',
  [Parameter(Mandatory = $true)]
  [string]$Informe
)
$ErrorActionPreference = 'Stop'
$p2Pointer = [IntPtr]::Zero
$p2Credential = $null
$p2Process = $null
try {
  $p2Info = [Diagnostics.ProcessStartInfo]::new()
  $p2Info.FileName = 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
  $p2Helper = Join-Path $PSScriptRoot 'p2-cliente-local.py.txt'
  if ($Informe.Contains('"')) { throw 'Ruta de informe inválida' }
  $p2Info.Arguments = '"{0}" "{1}" "{2}"' -f $p2Helper, $Modo, $Informe
  $p2Info.UseShellExecute = $false
  $p2Info.RedirectStandardInput = $true
  $p2Info.StandardInputEncoding = [Text.UTF8Encoding]::new($false)
  # Solo una frase falsa del ensayo; la frase real queda fuera de esta autorización.
  if ($Modo -eq 'ensayo-local') {
    $p2Credential = Read-Host 'Introduce SOLO una frase FALSA desechable para el ensayo local' -AsSecureString
    if ($p2Credential.Length -eq 0) { throw 'Frase sintética vacía' }
  }
  $p2Process = [Diagnostics.Process]::Start($p2Info)
  if ($Modo -eq 'ensayo-local') {
    $p2Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2Credential)
    $p2Process.StandardInput.WriteLine([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p2Pointer))
  }
  $p2Process.StandardInput.Close()
  $p2Process.WaitForExit()
  $p2ExitCode = $p2Process.ExitCode
} catch {
  Write-Output '{"failed":true,"stage":"local-wrapper","rawErrorOmitted":true}'
  $p2ExitCode = 1
} finally {
  if ($p2Pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p2Pointer) }
  if ($p2Credential) { $p2Credential.Dispose() }
  if ($p2Process) { $p2Process.Dispose() }
  $p2Credential = $null
}
exit $p2ExitCode
