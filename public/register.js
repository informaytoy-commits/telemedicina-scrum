document.addEventListener('DOMContentLoaded', () => {
    // Si ya está logueado, redirigir
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    
    if (token && rol) {
        window.location.href = `/${rol}.html`; // Redirigir a panel
        return;
    }

    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = document.getElementById('submitButton');
    const rolSelect = document.getElementById('rol');
    const medicoFields = document.getElementById('medicoFields');
    const especialidadSelect = document.getElementById('especialidad');

    // Cargar especialidades al iniciar
    const cargarEspecialidades = async () => {
        try {
            const response = await fetch('/api/especialidades');
            if (response.ok) {
                const especialidades = await response.json();
                especialidadSelect.innerHTML = '<option value="" disabled selected>Seleccione una especialidad</option>';
                especialidades.forEach(esp => {
                    const option = document.createElement('option');
                    // Usamos el nombre como value para mantener compatibilidad, el backend buscará el ID
                    option.value = esp.nombre; 
                    option.textContent = esp.nombre;
                    especialidadSelect.appendChild(option);
                });
            } else {
                especialidadSelect.innerHTML = '<option value="" disabled selected>Error al cargar especialidades</option>';
            }
        } catch (error) {
            console.error('Error fetching especialidades:', error);
            especialidadSelect.innerHTML = '<option value="" disabled selected>Error de conexión</option>';
        }
    };

    cargarEspecialidades();

    // UI Dinámica para médicos
    rolSelect.addEventListener('change', (e) => {
        if (e.target.value === 'medico') {
            medicoFields.classList.remove('hidden');
            document.getElementById('especialidad').required = true;
            document.getElementById('matricula_profesional').required = true;
            document.getElementById('documento').required = true;
        } else {
            medicoFields.classList.add('hidden');
            document.getElementById('especialidad').required = false;
            document.getElementById('matricula_profesional').required = false;
            document.getElementById('documento').required = false;
        }
    });

    // Preview de Avatar en Tiempo Real
    const inputFoto = document.getElementById('foto');
    const defaultAvatarIcon = document.getElementById('defaultAvatarIcon');
    const avatarPreviewImg = document.getElementById('avatarPreviewImg');

    if (inputFoto && defaultAvatarIcon && avatarPreviewImg) {
        inputFoto.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && (file.type.startsWith('image/'))) {
                const url = URL.createObjectURL(file);
                defaultAvatarIcon.style.display = 'none';
                avatarPreviewImg.src = url;
                avatarPreviewImg.style.display = 'block';
            } else {
                defaultAvatarIcon.style.display = 'block';
                avatarPreviewImg.src = '';
                avatarPreviewImg.style.display = 'none';
            }
        });
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error message
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        
        // Empezar loading state
        submitButton.classList.add('loading');
        submitButton.disabled = true;
        
        // Capturar datos manuales críticos
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        const rolValue = rolSelect.value;
        
        // Validación local estricta
        if (password.length < 6) {
            mostrarError('La contraseña debe tener al menos 6 caracteres.');
            detenerLoader();
            return;
        }
        
        if (password !== confirmPassword) {
            mostrarError('Las contraseñas no coinciden.');
            detenerLoader();
            return;
        }

        // Empaquetamiento FormData (Soporta archivos y textos auto detectados nativamente)
        const formData = new FormData(registerForm);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                // ATENCIÓN: NO SE CONFIGURA 'Content-Type'. Dejar que el navegador asigne el Boundary automático para FormData.
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Notificar éxito mediante la función global Toast
                const rolRegistrado = rolSelect.value;
                if(typeof AppHelper !== 'undefined' && typeof AppHelper.showToast === 'function') {
                    if (rolRegistrado === 'medico') {
                        AppHelper.showToast('Tu registro médico fue enviado correctamente. Debes esperar la validación del administrador para poder ingresar.', 'success');
                    } else {
                        AppHelper.showToast('Registro exitoso. Ya puedes iniciar sesión en la plataforma.', 'success');
                    }
                } else {
                    alert(rolRegistrado === 'medico' ? 'Tu registro médico fue enviado correctamente. Debes esperar la validación del administrador para poder ingresar.' : 'Registro exitoso. Ya puedes iniciar sesión en la plataforma.');
                }

                // Redirigir suave al login después de la confirmación
                const timeoutDelay = rolRegistrado === 'medico' ? 3000 : 2000;
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, timeoutDelay);

            } else {
                // Mostrar error proporcionado por el backend
                mostrarError(data.error || data.mensaje || data.message || 'Error al intentar registrarse. Intenta nuevamente.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            mostrarError('Error de conexión con el servidor. Intenta nuevamente.');
        } finally {
            detenerLoader();
        }
    });

    function mostrarError(mensaje) {
        errorMessage.textContent = mensaje;
        errorMessage.style.display = 'block';
    }

    function detenerLoader() {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
});
