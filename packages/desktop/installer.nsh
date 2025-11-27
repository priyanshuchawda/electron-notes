!macro customUnInstall
  MessageBox MB_YESNO "Do you want to delete your notes data as well?$\n$\nClick 'Yes' to delete all data, or 'No' to keep your notes." IDYES deleteData IDNO keepData
  
  deleteData:
    RMDir /r "$APPDATA\Quick Notes"
    RMDir /r "$LOCALAPPDATA\Quick Notes"
    Goto done
    
  keepData:
    ; User chose to keep data
    
  done:
!macroend
