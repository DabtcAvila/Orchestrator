#!/usr/bin/env python3
"""
Claude Code Smart Wrapper
Automaticamente guarda permisos en settings.local.json cuando seleccionas
"Yes, and don't ask again" (opción 2)
"""
import subprocess
import sys
import re
import json
import os
from pathlib import Path
import select
import time

class ClaudeWrapper:
    def __init__(self):
        self.settings_path = Path(".claude/settings.local.json")
        self.last_permission = None
        self.waiting_for_response = False
        self.permission_pattern = re.compile(r'(Bash|Read|Write|WebFetch|MCP)\([^)]*\)')
        self.debug = os.environ.get('CLAUDE_WRAPPER_DEBUG', '').lower() == 'true'
        
    def debug_log(self, message):
        """Log de debug opcional"""
        if self.debug:
            print(f"\n[DEBUG] {message}", file=sys.stderr)
    
    def load_settings(self):
        """Cargar settings.local.json"""
        if self.settings_path.exists():
            try:
                with open(self.settings_path, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                print(f"\n⚠️  Error leyendo {self.settings_path}, creando nuevo archivo", file=sys.stderr)
        return {"permissions": {"allow": [], "deny": []}}
    
    def save_settings(self, settings):
        """Guardar settings.local.json"""
        # Asegurar que el directorio existe
        self.settings_path.parent.mkdir(exist_ok=True)
        
        # Asegurar estructura correcta
        if "permissions" not in settings:
            settings["permissions"] = {}
        if "allow" not in settings["permissions"]:
            settings["permissions"]["allow"] = []
        if "deny" not in settings["permissions"]:
            settings["permissions"]["deny"] = []
        
        # Ordenar y eliminar duplicados
        settings["permissions"]["allow"] = sorted(list(set(settings["permissions"]["allow"])))
        
        # Guardar con formato bonito
        with open(self.settings_path, 'w') as f:
            json.dump(settings, f, indent=2)
    
    def add_permission(self, permission):
        """Agregar un permiso a settings.local.json"""
        settings = self.load_settings()
        
        if permission not in settings["permissions"]["allow"]:
            settings["permissions"]["allow"].append(permission)
            self.save_settings(settings)
            
            # Mensaje de confirmación con color verde
            print(f"\n\033[92m🔐 Auto-guardado en settings.local.json: {permission}\033[0m", file=sys.stderr)
            self.debug_log(f"Permiso agregado: {permission}")
            return True
        else:
            self.debug_log(f"Permiso ya existe: {permission}")
        return False
    
    def extract_permission(self, text):
        """Extraer el permiso del texto"""
        # Buscar el patrón más reciente
        matches = self.permission_pattern.findall(text)
        if matches:
            # Retornar el último match encontrado
            return matches[-1]
        return None
    
    def run(self):
        """Ejecutar Claude Code con interceptación"""
        # Comando para ejecutar Claude
        cmd = ['claude'] + sys.argv[1:]
        
        self.debug_log(f"Ejecutando: {' '.join(cmd)}")
        
        # Crear el proceso con PTY para mantener la interactividad
        import pty
        import os
        import fcntl
        
        # Crear un pseudo-terminal
        master, slave = pty.openpty()
        
        # Hacer el master non-blocking
        flags = fcntl.fcntl(master, fcntl.F_GETFL)
        fcntl.fcntl(master, fcntl.F_SETFL, flags | os.O_NONBLOCK)
        
        # Iniciar el proceso
        process = subprocess.Popen(
            cmd,
            stdin=slave,
            stdout=slave,
            stderr=slave,
            close_fds=True
        )
        
        # Cerrar el lado slave en el proceso padre
        os.close(slave)
        
        # Buffer para acumular salida
        output_buffer = ""
        last_lines = []
        
        try:
            while True:
                # Verificar si el proceso sigue vivo
                if process.poll() is not None:
                    break
                
                # Leer input del usuario
                if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
                    user_input = sys.stdin.read(1)
                    
                    # Si el usuario presiona '2' y estamos esperando respuesta
                    if user_input == '2' and self.waiting_for_response and self.last_permission:
                        self.debug_log(f"Usuario presionó 2, guardando: {self.last_permission}")
                        self.add_permission(self.last_permission)
                        self.waiting_for_response = False
                    
                    # Enviar input a Claude
                    os.write(master, user_input.encode())
                
                # Leer output de Claude
                try:
                    output = os.read(master, 4096).decode('utf-8', errors='replace')
                    if output:
                        # Mostrar output al usuario
                        sys.stdout.write(output)
                        sys.stdout.flush()
                        
                        # Acumular en buffer para análisis
                        output_buffer += output
                        
                        # Mantener solo las últimas líneas para análisis
                        lines = output_buffer.split('\n')
                        last_lines = lines[-20:]  # Últimas 20 líneas
                        
                        # Buscar permisos en el output reciente
                        recent_text = '\n'.join(last_lines)
                        
                        # Detectar comandos que requieren permiso
                        permission = self.extract_permission(recent_text)
                        if permission:
                            self.last_permission = permission
                            self.debug_log(f"Permiso detectado: {permission}")
                        
                        # Detectar el menú de opciones
                        if "Do you want to proceed?" in recent_text:
                            self.debug_log("Menú de permisos detectado")
                            
                        # Detectar opción 2 en el menú
                        if "2. Yes, and don't ask again" in recent_text or \
                           "2. Yes, and don't ask again for similar" in recent_text:
                            self.waiting_for_response = True
                            self.debug_log(f"Esperando respuesta del usuario. Último permiso: {self.last_permission}")
                        
                        # Limpiar buffer si es muy grande
                        if len(output_buffer) > 10000:
                            output_buffer = '\n'.join(last_lines)
                            
                except (OSError, IOError):
                    # No hay datos disponibles
                    pass
                
                # Pequeña pausa para no consumir CPU
                time.sleep(0.01)
                
        except KeyboardInterrupt:
            # Manejar Ctrl+C gracefully
            process.terminate()
            print("\n\nInterrumpido por el usuario", file=sys.stderr)
        finally:
            # Cerrar el master
            os.close(master)
            
            # Esperar a que termine el proceso
            process.wait()
        
        return process.returncode

if __name__ == "__main__":
    # Mensaje de inicio (solo si no hay argumentos o es modo interactivo)
    if len(sys.argv) == 1 or not any(arg.startswith('-') for arg in sys.argv[1:]):
        print("\033[94m🤖 Claude Wrapper Activo - Los permisos se guardarán automáticamente\033[0m", file=sys.stderr)
        print("\033[90mTip: Usa CLAUDE_WRAPPER_DEBUG=true claude para ver logs de debug\033[0m", file=sys.stderr)
    
    wrapper = ClaudeWrapper()
    sys.exit(wrapper.run())