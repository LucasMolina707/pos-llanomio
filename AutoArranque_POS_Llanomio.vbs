Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strScriptPath = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. Intentar con el ejecutable principal Iniciar_Servidor_POS.exe
strExePath = strScriptPath & "\Iniciar_Servidor_POS.exe"
strBatPath = strScriptPath & "\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat"

If fso.FileExists(strExePath) Then
    ' Ejecuta Iniciar_Servidor_POS.exe que levanta el servidor y abre el sistema
    WshShell.Run Chr(34) & strExePath & Chr(34), 0, False
ElseIf fso.FileExists(strBatPath) Then
    ' Respaldo con script batch en modo silencioso
    WshShell.Run Chr(34) & strBatPath & Chr(34) & " --silencioso", 0, False
End If
