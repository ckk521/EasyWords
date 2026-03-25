import paramiko
import os
import base64

host = '192.168.1.3'
port = 24
username = 'ckk'
password = 'Ckk@5276241'
sudo_pwd = 'Ckk@5276241'
remote_base = '/volume1/docker/IT/EasyWordsV3'
local_path = '.'
skip_items = {'node_modules', '.git', '.next', '__pycache__', '.claude'}

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port, username, password)

print('清理旧文件...')
ssh.exec_command(f'rm -rf {remote_base}')[1].read()
ssh.exec_command(f'mkdir -p {remote_base}')[1].read()

all_files, all_dirs = [], []
for root, dirs, files in os.walk(local_path):
    dirs[:] = [d for d in dirs if d not in skip_items]
    rel_dir = os.path.relpath(root, local_path)
    remote_dir = remote_base if rel_dir == '.' else remote_base + '/' + rel_dir.replace('\\', '/')
    if rel_dir != '.':
        all_dirs.append(remote_dir)
    for f in files:
        if f not in skip_items and not f.endswith('.tar.gz'):
            all_files.append((os.path.join(root, f), remote_dir + '/' + f))

print(f'找到 {len(all_dirs)} 个目录, {len(all_files)} 个文件')

ssh.exec_command('mkdir -p ' + ' '.join([f"'{d}'" for d in all_dirs]))[1].read()

print('上传文件中...')
for i, (local_file, remote_file) in enumerate(all_files):
    b64 = base64.b64encode(open(local_file, 'rb').read()).decode()
    ssh.exec_command(f"> '{remote_file}'")[1].read()
    for j in range(0, len(b64), 7000):
        ssh.exec_command(f"echo -n '{b64[j:j+7000]}' >> '{remote_file}'")[1].read()
    ssh.exec_command(f"base64 -d '{remote_file}' > '{remote_file}.tmp' && mv '{remote_file}.tmp' '{remote_file}'")[1].read()

print(f'上传完成: {len(all_files)} 个文件')

print('停止旧容器...')
ssh.exec_command(f"echo '{sudo_pwd}' | sudo -S docker compose -f {remote_base}/docker-compose.yml down 2>&1")[1].read()

print('构建并启动新容器...')
stdin, stdout, stderr = ssh.exec_command(f"cd {remote_base} && echo '{sudo_pwd}' | sudo -S docker compose up -d --build 2>&1")
stdout.read().decode('utf-8', errors='replace')
print('构建完成')

ssh.close()
print('部署完成!')
