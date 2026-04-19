document.addEventListener('DOMContentLoaded', () => {
    // Si ya está logueado, redirigir
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    
    if (token && rol) {
        redirigirPorRol(rol);
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = document.getElementById('submitButton');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error message
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        
        // Empezar loading state
        submitButton.classList.add('loading');
        submitButton.disabled = true;
        
        // Capturar datos
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Guardar en localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                localStorage.setItem('rol', data.usuario.rol);
                
                // Redirigir según rol
                redirigirPorRol(data.usuario.rol);
            } else {
                // Mostrar error real proveniente del backend
                mostrarError(data.error || data.mensaje || data.message || 'Error al iniciar sesión. Verifica tus credenciales.');
            }
        } catch (error) {
            console.error('Login error:', error);
            mostrarError('Error de conexión con el servidor. Intenta nuevamente.');
        } finally {
            // Quitar loading state
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
        }
    });

    function mostrarError(mensaje) {
        errorMessage.textContent = mensaje;
        errorMessage.style.display = 'block';
    }

    function redirigirPorRol(rol) {
        switch(rol) {
            case 'admin':
                window.location.href = '/admin.html';
                break;
            case 'medico':
                window.location.href = '/medico.html';
                break;
            case 'paciente':
                window.location.href = '/paciente.html';
                break;
            default:
                mostrarError('Rol desconocido o no asignado.');
                // limpiar cache
                localStorage.clear();
        }
    }
});
