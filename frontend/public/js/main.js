// Main JavaScript file for FreshLink frontend

document.addEventListener('DOMContentLoaded', function() {
    // Initialize any components that need JavaScript functionality
    initializeFlashMessages();
    initializeProductCards();
    initializeFormValidation();
    initializeDropdowns();
    initializeModalDialogs();
});

// Handle flash messages auto-dismissal
function initializeFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(message => {
        // Auto-dismiss flash messages after 5 seconds
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                message.style.display = 'none';
            }, 300);
        }, 5000);
        
        // Add close button functionality
        const closeBtn = message.querySelector('.close-alert');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                message.style.opacity = '0';
                setTimeout(() => {
                    message.style.display = 'none';
                }, 300);
            });
        }
    });
}

// Add functionality to product cards
function initializeProductCards() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        // Add hover class for animation effect
        card.addEventListener('mouseenter', () => {
            card.classList.add('product-card-hover');
        });
        
        card.addEventListener('mouseleave', () => {
            card.classList.remove('product-card-hover');
        });
    });
}

// Form validation functions
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            // Get all required fields
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            // Check each required field
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('border-red-500');
                    
                    // Add error message if it doesn't exist
                    let errorElement = field.parentElement.querySelector('.error-message');
                    if (!errorElement) {
                        errorElement = document.createElement('p');
                        errorElement.classList.add('error-message', 'text-red-500', 'text-xs', 'mt-1');
                        errorElement.textContent = 'This field is required';
                        field.parentElement.appendChild(errorElement);
                    }
                } else {
                    field.classList.remove('border-red-500');
                    
                    // Remove error message if it exists
                    const errorElement = field.parentElement.querySelector('.error-message');
                    if (errorElement) {
                        errorElement.remove();
                    }
                }
            });
            
            // Prevent form submission if validation fails
            if (!isValid) {
                event.preventDefault();
            }
        });
    });
}

// Initialize dropdown menus
function initializeDropdowns() {
    const dropdownButtons = document.querySelectorAll('.dropdown-button');
    
    dropdownButtons.forEach(button => {
        button.addEventListener('click', function() {
            const dropdownMenu = this.nextElementSibling;
            
            // Toggle dropdown visibility
            if (dropdownMenu.classList.contains('hidden')) {
                // Close all other dropdowns
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    if (menu !== dropdownMenu) {
                        menu.classList.add('hidden');
                    }
                });
                
                // Open this dropdown
                dropdownMenu.classList.remove('hidden');
            } else {
                // Close this dropdown
                dropdownMenu.classList.add('hidden');
            }
        });
    });
    
    // Close all dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    });
}

// Initialize modal dialogs
function initializeModalDialogs() {
    const modalOpenButtons = document.querySelectorAll('[data-modal-open]');
    const modalCloseButtons = document.querySelectorAll('[data-modal-close]');
    
    // Open modal
    modalOpenButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal-open');
            const modal = document.getElementById(modalId);
            
            if (modal) {
                modal.classList.remove('hidden');
                document.body.classList.add('overflow-hidden'); // Prevent scrolling
            }
        });
    });
    
    // Close modal
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            
            if (modal) {
                modal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden'); // Re-enable scrolling
            }
        });
    });
    
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(event) {
            if (event.target === this) {
                const modal = this.closest('.modal');
                
                if (modal) {
                    modal.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden'); // Re-enable scrolling
                }
            }
        });
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        currencyDisplay: 'narrowSymbol'
    }).format(amount).replace('KES', 'KSh');
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Handle quantity input for order forms
function updateTotalPrice(quantityInput, pricePerUnit) {
    const quantity = parseInt(quantityInput.value) || 0;
    const totalPrice = quantity * pricePerUnit;
    
    const totalPriceElement = document.getElementById('total-price');
    if (totalPriceElement) {
        totalPriceElement.textContent = formatCurrency(totalPrice);
    }
} 