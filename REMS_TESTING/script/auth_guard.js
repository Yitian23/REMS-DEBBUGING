/**
 * Authentication Guard Script
 * This script MUST be included at the top of every protected page
 * It checks if a user is logged in and redirects to index.html if not
 */

(function() {
    'use strict';
    
    /**
     * Check if user is authenticated
     * Checks both localStorage and makes a server-side session check
     */
    function checkAuthentication() {
        // First check: localStorage (quick client-side check)
        const loggedIn = localStorage.getItem('loggedIn');
        const userData = localStorage.getItem('user');
        
        // If no local authentication data, redirect immediately
        if (!loggedIn || loggedIn !== 'true' || !userData) {
            console.warn('No local authentication found. Redirecting to login...');
            redirectToLogin();
            return false;
        }
        
        // Second check: Verify session with server
        verifyServerSession();
        
        return true;
    }
    
    /**
     * Verify session with the server
     * This makes an AJAX call to check if the PHP session is still valid
     */
    function verifyServerSession() {
        fetch('api.php?endpoint=verify_session', {
            method: 'GET',
            credentials: 'same-origin', // Include cookies
            cache: 'no-cache'
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success || !data.authenticated) {
                console.warn('Server session invalid. Clearing local data and redirecting...');
                clearAuthData();
                redirectToLogin();
            }
        })
        .catch(error => {
            console.error('Error verifying session:', error);
            // Don't redirect on network error, but log it
            console.warn('Could not verify server session - network error');
        });
    }
    
    /**
     * Clear all authentication data
     */
    function clearAuthData() {
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
    }
    
    /**
     * Redirect to login page
     */
    function redirectToLogin() {
        // Prevent any further script execution
        window.stop && window.stop();
        
        // Clear authentication data
        clearAuthData();
        
        // Redirect to login page
        window.location.href = 'index.html';
    }
    
    /**
     * Setup logout functionality
     * This function is called when user clicks logout
     */
    window.confirmLogout = function() {
        // Show loading state if logout button exists
        const logoutBtn = document.querySelector('.modal-btn-yes');
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
        }
        
        // Call server-side logout
        fetch('api.php?endpoint=logout', {
            method: 'POST',
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            clearAuthData();
            redirectToLogin();
        })
        .catch(error => {
            console.error('Logout error:', error);
            // Even if server logout fails, clear local data and redirect
            clearAuthData();
            redirectToLogin();
        });
    };
    
    /**
     * Initialize authentication check when DOM is ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuthentication);
    } else {
        // DOM is already ready
        checkAuthentication();
    }
    
    /**
     * Also check authentication when page becomes visible
     * This handles cases where user switches tabs and comes back
     */
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            checkAuthentication();
        }
    });
    
    /**
     * Prevent caching of protected pages
     */
    window.addEventListener('pageshow', function(event) {
        // If page is loaded from cache (back/forward navigation)
        if (event.persisted) {
            checkAuthentication();
        }
    });
    
})();