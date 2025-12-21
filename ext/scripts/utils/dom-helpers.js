// ===================================
// DOM-HELPERS.JS
// DOM Manipulation Utility Functions
// Location: scripts/utils/dom-helpers.js
// ===================================

const DOMHelpers = {
  /**
   * Wait for element to exist
   */
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  },

  /**
   * Check if element is visible
   */
  isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           element.offsetParent !== null;
  },

  /**
   * Check if element is in viewport
   */
  isInViewport(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Scroll element into view
   */
  scrollIntoView(element, behavior = 'smooth') {
    if (!element) return;
    
    element.scrollIntoView({
      behavior: behavior,
      block: 'center',
      inline: 'center'
    });
  },

  /**
   * Find element by XPath
   */
  getElementByXPath(xpath) {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    
    return result.singleNodeValue;
  },

  /**
   * Find all elements by XPath
   */
  getElementsByXPath(xpath) {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    const elements = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      elements.push(result.snapshotItem(i));
    }
    
    return elements;
  },

  /**
   * Create element with attributes
   */
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.substring(2).toLowerCase(), value);
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Append children
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
    
    return element;
  },

  /**
   * Remove element
   */
  removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },

  /**
   * Remove all children
   */
  removeAllChildren(element) {
    if (!element) return;
    
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  },

  /**
   * Add class to element
   */
  addClass(element, className) {
    if (!element) return;
    
    const classes = className.split(' ').filter(c => c);
    element.classList.add(...classes);
  },

  /**
   * Remove class from element
   */
  removeClass(element, className) {
    if (!element) return;
    
    const classes = className.split(' ').filter(c => c);
    element.classList.remove(...classes);
  },

  /**
   * Toggle class on element
   */
  toggleClass(element, className) {
    if (!element) return;
    
    element.classList.toggle(className);
  },

  /**
   * Check if element has class
   */
  hasClass(element, className) {
    if (!element) return false;
    
    return element.classList.contains(className);
  },

  /**
   * Get element position
   */
  getPosition(element) {
    if (!element) return { top: 0, left: 0 };
    
    const rect = element.getBoundingClientRect();
    
    return {
      top: rect.top + window.pageYOffset,
      left: rect.left + window.pageXOffset,
      width: rect.width,
      height: rect.height
    };
  },

  /**
   * Set element position
   */
  setPosition(element, top, left) {
    if (!element) return;
    
    element.style.position = 'absolute';
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
  },

  /**
   * Get element size
   */
  getSize(element) {
    if (!element) return { width: 0, height: 0 };
    
    return {
      width: element.offsetWidth,
      height: element.offsetHeight
    };
  },

  /**
   * Set element size
   */
  setSize(element, width, height) {
    if (!element) return;
    
    if (width !== null) element.style.width = `${width}px`;
    if (height !== null) element.style.height = `${height}px`;
  },

  /**
   * Show element
   */
  show(element, displayType = 'block') {
    if (!element) return;
    
    element.style.display = displayType;
  },

  /**
   * Hide element
   */
  hide(element) {
    if (!element) return;
    
    element.style.display = 'none';
  },

  /**
   * Fade in element
   */
  fadeIn(element, duration = 300) {
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let start = null;
    
    function animate(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.min(progress / duration, 1);
      
      element.style.opacity = opacity;
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  },

  /**
   * Fade out element
   */
  fadeOut(element, duration = 300) {
    if (!element) return;
    
    let start = null;
    const initialOpacity = parseFloat(window.getComputedStyle(element).opacity) || 1;
    
    function animate(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.max(initialOpacity - (progress / duration), 0);
      
      element.style.opacity = opacity;
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
      }
    }
    
    requestAnimationFrame(animate);
  },

  /**
   * Get closest parent matching selector
   */
  closest(element, selector) {
    if (!element) return null;
    
    return element.closest(selector);
  },

  /**
   * Get siblings of element
   */
  getSiblings(element) {
    if (!element || !element.parentNode) return [];
    
    return Array.from(element.parentNode.children).filter(child => child !== element);
  },

  /**
   * Insert after element
   */
  insertAfter(newElement, referenceElement) {
    if (!newElement || !referenceElement || !referenceElement.parentNode) return;
    
    referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
  },

  /**
   * Insert before element
   */
  insertBefore(newElement, referenceElement) {
    if (!newElement || !referenceElement || !referenceElement.parentNode) return;
    
    referenceElement.parentNode.insertBefore(newElement, referenceElement);
  },

  /**
   * Trigger event on element
   */
  triggerEvent(element, eventName, data = {}) {
    if (!element) return;
    
    const event = new CustomEvent(eventName, {
      bubbles: true,
      cancelable: true,
      detail: data
    });
    
    element.dispatchEvent(event);
  },

  /**
   * Debounce function
   */
  debounce(func, wait = 300) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   */
  throttle(func, limit = 300) {
    let inThrottle;
    
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMHelpers;
}