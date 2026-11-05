' ===============================================================================
' LANZADOR SILENCIOSO INVISIBLE PARA INICIO DE WINDOWS - POS LLANOMIO
' ===============================================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtener la carpeta donde reside este script
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(scriptDir, "ARRANQUE_AUTOMATICO_SISTEMA.bat")

If fso.FileExists(batPath) Then
    WshShell.Run Chr(34) & batPath & Chr(34) & " --abrir-pantalla", 0, False
Else
    ' Fallback si fue copiado a la carpeta Startup u otra ubicacion externa
    posRoot = fso.GetAbsolutePathName(scriptDir & "\..\..")
    fallbackBat = fso.BuildPath(posRoot, "instalador_tienda\2_INICIADORES_Y_ACTIVADORES\ARRANQUE_AUTOMATICO_SISTEMA.bat")
    If fso.FileExists(fallbackBat) Then
        WshShell.Run Chr(34) & fallbackBat & Chr(34) & " --abrir-pantalla", 0, False
    End If
End If
