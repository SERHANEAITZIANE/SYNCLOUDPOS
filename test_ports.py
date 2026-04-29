import socket

target = 'chirpedbeo.online'
ports = [21, 22, 2083, 2121, 2222, 65002]

for port in ports:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex((target, port))
    if result == 0:
        print(f"Port {port}: OPEN")
    else:
        print(f"Port {port}: CLOSED ({result})")
    sock.close()
