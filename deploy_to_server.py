import paramiko
import time
import os
import zipfile

def create_zip():
    print("Comprimiendo proyecto (excluyendo node_modules, .next, .git)...")
    zip_path = 'app.zip'
    if os.path.exists(zip_path):
        os.remove(zip_path)
        
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Excluir carpetas pesadas/innecesarias
            dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.git', 'dist')]
            
            for file in files:
                if file == zip_path or file == 'deploy_to_server.py':
                    continue
                file_path = os.path.join(root, file)
                zipf.write(file_path, arcname=os.path.relpath(file_path, '.'))
    print(f"Archivo zip creado: {zip_path}")
    return zip_path

def deploy():
    host = '192.168.1.11'
    port = 22
    username = 'unai'
    password = 'Donquijote27'
    
    zip_path = create_zip()
    remote_zip = '/home/unai/desktop-dashboard.zip'
    
    try:
        print("Conectando al servidor vía SFTP...")
        transport = paramiko.Transport((host, port))
        transport.connect(username=username, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)
        
        print("Subiendo código fuente comprimido...")
        sftp.put(zip_path, remote_zip)
        
        # Subir también variables de entorno
        if os.path.exists('.env.local'):
            print("Subiendo .env.local...")
            sftp.put('.env.local', '/home/unai/desktop-dashboard-env.local')
            
        sftp.close()
        transport.close()
        print("Subida completada.")
        
        print("Conectando vía SSH para desplegar en Docker...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(host, username=username, password=password, timeout=10)
        
        channel = client.invoke_shell()
        time.sleep(1)
        channel.send('su -\n')
        time.sleep(1)
        channel.send('Junterr27\n')
        time.sleep(2)
        
        print("Preparando el directorio en /opt/desktop-dashboard...")
        channel.send('mkdir -p /opt/desktop-dashboard\n')
        time.sleep(1)
        
        print("Moviendo y extrayendo los archivos...")
        channel.send('mv /home/unai/desktop-dashboard.zip /opt/desktop-dashboard/\n')
        time.sleep(1)
        if os.path.exists('.env.local'):
            channel.send('mv /home/unai/desktop-dashboard-env.local /opt/desktop-dashboard/.env.local\n')
            time.sleep(1)
            
        channel.send('cd /opt/desktop-dashboard\n')
        time.sleep(1)
        
        # Instalar unzip si no está
        channel.send('apt-get install -y unzip\n')
        time.sleep(2)
        
        # Sobrescribir archivos extraídos
        channel.send('unzip -o desktop-dashboard.zip\n')
        time.sleep(3)
        
        print("Construyendo y arrancando el contenedor Docker de CoupleWallet...")
        channel.send('docker compose up -d --build\n')
        
        # Esperar a que se complete el build (Next.js puede tardar un par de minutos)
        time.sleep(180)
        
        channel.send('exit\n') # Salir de su -
        time.sleep(1)
        
        output = channel.recv(999999).decode('utf-8', errors='ignore')
        
        print("================ SALIDA DEL SERVIDOR ================")
        lines = output.split('\n')
        for line in lines[-50:]: # Imprimir solo el final para no saturar
            # Convertir a ascii de forma segura ignorando caracteres raros (como los cuadros de docker build)
            safe_line = line.strip().encode('ascii', 'replace').decode('ascii')
            print(safe_line)
        print("=====================================================")
        
        print("¡Despliegue completado con éxito! La app debería estar corriendo en 192.168.1.11:3006")
        client.close()
        
        # Limpiar zip local
        if os.path.exists(zip_path):
            os.remove(zip_path)
            
    except Exception as e:
        print(f"Error durante el despliegue: {e}")
        # Limpiar zip local en caso de error
        if os.path.exists(zip_path):
            os.remove(zip_path)

if __name__ == '__main__':
    deploy()
