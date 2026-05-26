import ftplib
import sys

host = 'chirpedbeo.online'
user = 'chirpedbeo'
password = 'C4r3vL[N7~_ulO%^'

try:
    print(f"Connecting to FTP on {host}...")
    ftp = ftplib.FTP(host, timeout=10)
    ftp.login(user, password)
    print("Connected successfully!")
    print("Files in root:")
    ftp.retrlines('LIST')
    ftp.quit()
except Exception as e:
    print(f"FTP Connection failed: {e}")
