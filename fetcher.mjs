/**
 * Fetcher class for making HTTP requests with built-in error handling and configuration
 */
export default class Fetcher {
    /**
     * Create a new Fetcher instance
     * @param {Object} options - Configuration options
     * @param {string} options.baseURL - Base URL for all requests
     * @param {Object} options.headers - Default headers for all requests
     * @param {number} options.timeout - Request timeout in milliseconds (default: 10000)
     * @param {Object} options.defaultParams - Default query parameters for all requests
     * @param {Function} options.interceptor - Request/response interceptor function
     */
    constructor(options = {}) {
        this.baseURL = options.baseURL || '';
        this.headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        this.timeout = options.timeout || 10000;
        this.defaultParams = options.defaultParams || {};
        this.interceptor = options.interceptor || null;

        // Store AbortController instances for timeout management
        this.abortControllers = new Map();
    }

    /**
     * Build URL with base URL and query parameters
     * @param {string} url - Request URL
     * @param {Object} params - Query parameters
     * @returns {string} Complete URL
     */
    _buildURL(url, params = {}) {
        // Combine default params with request-specific params
        const allParams = { ...this.defaultParams, ...params };

        // Build query string
        const queryString = Object.keys(allParams)
            .filter(key => allParams[key] !== undefined && allParams[key] !== null)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
            .join('&');

        const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        return queryString ? `${fullURL}${fullURL.includes('?') ? '&' : '?'}${queryString}` : fullURL;
    }

    /**
     * Apply timeout to fetch request
     * @param {string} requestId - Unique identifier for the request
     * @param {Promise} fetchPromise - The fetch promise
     * @returns {Promise} Promise that rejects on timeout
     */
    _applyTimeout(requestId, fetchPromise) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                // Abort the request if we have an AbortController for it
                const controller = this.abortControllers.get(requestId);
                if (controller) {
                    controller.abort();
                }
                reject(new Error(`Request timeout after ${this.timeout}ms`));
            }, this.timeout);

            fetchPromise
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * Execute a fetch request with proper error handling
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise} Promise resolving to response data
     */
    async _request(method, url, options = {}) {
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const abortController = new AbortController();
        this.abortControllers.set(requestId, abortController);

        try {
            const requestOptions = {
                method,
                headers: { ...this.headers, ...options.headers },
                signal: abortController.signal,
                ...options,
            };

            // Remove headers from options to avoid duplication
            delete requestOptions.headers;

            // Apply interceptor if provided
            let interceptedRequest = { url, options: requestOptions };
            if (this.interceptor && typeof this.interceptor === 'function') {
                interceptedRequest = this.interceptor({ url, options: requestOptions, method }) || interceptedRequest;
            }

            const fullURL = this._buildURL(interceptedRequest.url, options.params);

            // Create fetch promise with timeout
            const fetchPromise = fetch(fullURL, interceptedRequest.options)
                .then(async response => {
                    // Remove from abort controllers map
                    this.abortControllers.delete(requestId);

                    // Check if response is OK
                    if (!response.ok) {
                        let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.message || errorData.error || errorMessage;
                        } catch (e) {
                            // If we can't parse JSON, try text
                            try {
                                const errorText = await response.text();
                                if (errorText) errorMessage = errorText;
                            } catch (textError) {
                                // Ignore text parsing errors
                            }
                        }
                        throw new Error(errorMessage);
                    }

                    // Parse response based on content type
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response.json();
                    } else {
                        return response.text();
                    }
                });

            const result = await this._applyTimeout(requestId, fetchPromise);

            // Apply response interceptor if provided
            if (this.interceptor && typeof this.interceptor === 'function') {
                return this.interceptor({ response: result, method, url }) || result;
            }

            return result;
        } catch (error) {
            // Remove from abort controllers map
            this.abortControllers.delete(requestId);

            // Handle specific error types
            if (error.name === 'AbortError') {
                throw new Error(`Request aborted: ${error.message}`);
            }

            throw error;
        }
    }

    /**
     * Send a GET request to the specified URL
     * @param {string} url - Request URL
     * @param {Object} params - Query parameters
     * @param {Object} options - Additional fetch options
     * @returns {Promise} Promise resolving to response data
     */
    async get(url, params = {}, options = {}) {
        return this._request('GET', url, {
            params,
            ...options,
        });
    }

    /**
     * Send a POST request to the specified URL
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Additional fetch options
     * @returns {Promise} Promise resolving to response data
     */
    async post(url, data = {}, options = {}) {
        return this._request('POST', url, {
            body: JSON.stringify(data),
            ...options,
        });
    }

    /**
     * Send a PUT request to the specified URL
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Additional fetch options
     * @returns {Promise} Promise resolving to response data
     */
    async put(url, data = {}, options = {}) {
        return this._request('PUT', url, {
            body: JSON.stringify(data),
            ...options,
        });
    }

    /**
     * Send a DELETE request to the specified URL
     * @param {string} url - Request URL
     * @param {Object} options - Additional fetch options
     * @returns {Promise} Promise resolving to response data
     */
    async delete(url, options = {}) {
        return this._request('DELETE', url, options);
    }

    /**
     * Send a PATCH request to the specified URL
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Additional fetch options
     * @returns {Promise} Promise resolving to response data
     */
    async patch(url, data = {}, options = {}) {
        return this._request('PATCH', url, {
            body: JSON.stringify(data),
            ...options,
        });
    }

    /**
     * Set default headers
     * @param {Object} headers - Headers to set
     */
    setHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
    }

    /**
     * Clear all default headers
     */
    clearHeaders() {
        this.headers = {};
    }

    /**
     * Set a single header
     * @param {string} key - Header name
     * @param {string} value - Header value
     */
    setHeader(key, value) {
        this.headers[key] = value;
    }

    /**
     * Remove a header
     * @param {string} key - Header name to remove
     */
    removeHeader(key) {
        delete this.headers[key];
    }

    /**
     * Set base URL
     * @param {string} baseURL - Base URL for all requests
     */
    setBaseURL(baseURL) {
        this.baseURL = baseURL;
    }

    /**
     * Abort a specific request by its ID
     * @param {string} requestId - Request ID to abort
     */
    abortRequest(requestId) {
        const controller = this.abortControllers.get(requestId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(requestId);
        }
    }

    /**
     * Abort all pending requests
     */
    abortAllRequests() {
        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers.clear();
    }

    /**
     * Create a new instance with merged options
     * @param {Object} options - Additional options to merge
     * @returns {Fetcher} New Fetcher instance
     */
    createInstance(options = {}) {
        return new Fetcher({
            baseURL: this.baseURL,
            headers: this.headers,
            timeout: this.timeout,
            defaultParams: this.defaultParams,
            interceptor: this.interceptor,
            ...options,
        });
    }
}

// Export the Fetcher class for use in Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Fetcher;
}

// Export as ES6 module if supported
if (typeof window !== 'undefined') {
    window.Fetcher = Fetcher;
}