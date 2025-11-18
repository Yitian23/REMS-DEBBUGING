// Toggle sidebar for mobile
    function toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
            
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

        // Close sidebar when clicking on a nav item (mobile only)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 767) {
                    const sidebar = document.querySelector('.sidebar');
                    const overlay = document.querySelector('.sidebar-overlay');
                    
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        });