// script.js
async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    
    // Render products to the page
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) {
      console.error('Products container not found');
      return;
    }
    
    productsContainer.innerHTML = '';
    
    products.forEach(product => {
      const productElement = document.createElement('div');
      productElement.className = 'product-card';
      productElement.innerHTML = `
        <div class="product-img">
          <img src="${product.imageUrl || '/api/placeholder/250/200'}" alt="${product.name}">
        </div>
        <div class="product-content">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <span class="price">£${product.price.toFixed(2)}</span>
          <button class="btn" onclick="addToCart('${product._id}', '${product.name}', ${product.price})">Add to Cart</button>
        </div>
      `;
      
      productsContainer.appendChild(productElement);
    });
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

// Cart functionality
let cart = [];

function addToCart(id, name, price) {
  // Check if product is already in cart
  const existingItem = cart.find(item => item.id === id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  
  // Show toast notification
  showToast(`${name} added to cart!`);
  
  // Update cart display
  updateCartCount();
}

function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalItems;
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  // Add toast to page
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    const newToastContainer = document.createElement('div');
    newToastContainer.id = 'toast-container';
    newToastContainer.className = 'toast-container';
    document.body.appendChild(newToastContainer);
    newToastContainer.appendChild(toast);
  } else {
    toastContainer.appendChild(toast);
  }
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 3000);
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Only fetch products if we're on the shop page
  const productsContainer = document.getElementById('products-container');
  if (productsContainer) {
    fetchProducts();
  }
  
  // Initialize cart count
  updateCartCount();
});
