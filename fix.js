// Import required modules
const fs = require('fs'); // For file operations
const readline = require('readline'); // For command-line input/output
const path = require('path'); // For handling file paths
const os = require('os'); // OS module (not directly used but can be removed if unnecessary)

// Define the file path for storing orders
const ORDERS_FILE = path.join(__dirname, 'orders.json');

/**
 * Order Class
 * Represents an order with details such as ID, customer name, items, priority, and status.
 */
class Order {
    /**
     * Constructor to initialize order properties.
     * @param {string} order_id - Unique ID of the order.
     * @param {string} customer_name - Name of the customer.
     * @param {Array<string>} items - List of ordered items.
     * @param {boolean} is_high_priority - Indicates if the order is high priority.
     * @param {string} [status='pending'] - Order status; defaults to 'pending'.
     */
    constructor(order_id, customer_name, items, is_high_priority, status = 'pending') {
        this.order_id = order_id;
        this.customer_name = customer_name;
        this.items = items;
        this.is_high_priority = is_high_priority;
        this.status = status;
    }

    /**
     * Converts the Order object into a plain dictionary for JSON storage.
     * @returns {Object} - Dictionary representation of the Order object.
     */
    toDict() {
        return {
            order_id: this.order_id,
            customer_name: this.customer_name,
            items: this.items,
            is_high_priority: this.is_high_priority,
            status: this.status
        };
    }
}

/**
 * Loads orders from the JSON file.
 * @returns {Array<Order>} - Array of Order objects.
 */
function loadOrders() {
    // Check if the file exists and has content
    if (fs.existsSync(ORDERS_FILE) && fs.statSync(ORDERS_FILE).size > 0) {
        try {
            const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
            const ordersData = JSON.parse(data);
            // Map JSON data to Order objects
            if (Array.isArray(ordersData)) {
                return ordersData.map(order => new Order(
                    order.order_id, order.customer_name, order.items, order.is_high_priority, order.status
                ));
            } else {
                console.log("Error: Invalid file format. Initializing a new file.");
                return [];
            }
        } catch (err) {
            console.log("Error: Corrupted order file. Initializing a new file.");
            return [];
        }
    }
    return [];
}

/**
 * Saves the orders array to the JSON file.
 * @param {Array<Order>} orders - Array of orders to be saved.
 */
function saveOrders(orders) {
    const fd = fs.openSync(ORDERS_FILE, 'w'); // Open file descriptor for writing
    try {
        // Convert orders to JSON format and save to file
        const data = JSON.stringify(orders.map(order => order.toDict()), null, 4);
        fs.writeFileSync(ORDERS_FILE, data);
    } catch (err) {
        console.log("Error saving orders: ", err.message);
    } finally {
        fs.closeSync(fd); // Close file descriptor
    }
}

/**
 * Displays all pending orders in sorted order.
 * High-priority orders are shown first, followed by others.
 * @param {Array<Order>} orders - Array of orders to display.
 */
function showPendingOrders(orders) {
    console.log("\n--- Pending Orders ---");
    // Filter and sort pending orders
    const pendingOrders = orders
        .filter(order => order.status === 'pending')
        .sort((a, b) => (b.is_high_priority - a.is_high_priority) || a.order_id.localeCompare(b.order_id));

    if (pendingOrders.length === 0) {
        console.log("No pending orders.\n");
    } else {
        // Display each pending order
        pendingOrders.forEach(order => {
            console.log(`Order ID: ${order.order_id}, Customer: ${order.customer_name}, Items: ${order.items.join(', ')}, Priority: ${order.is_high_priority ? 'Yes' : 'No'}`);
        });
        console.log("\n");
    }
}

/**
 * Handles the processing of orders.
 * Prompts users to process high-priority orders first, followed by regular orders.
 * Allows exiting the process at any time.
 * @param {Array<Order>} orders - Array of orders.
 * @param {readline.Interface} rl - Readline interface for input.
 */
function processOrder(orders, rl) {
    showPendingOrders(orders); // Display current pending orders

    const highPriorityOrders = orders.filter(o => o.status === 'pending' && o.is_high_priority);
    const nonPriorityOrders = orders.filter(o => o.status === 'pending' && !o.is_high_priority);

    // Helper function to allow user to exit or continue
    function promptToExitOrContinue(callback) {
        rl.question("Do you want to continue processing orders? (yes/no): ", (answer) => {
            if (answer.toLowerCase() === 'no') {
                console.log("Returning to main menu...\n");
                mainMenu(orders, rl);
            } else {
                callback();
            }
        });
    }

    // Process high-priority orders first
    if (highPriorityOrders.length > 0) {
        console.log("You must process high-priority orders first.");
        const firstHighPriority = highPriorityOrders[0];
        rl.question(`Enter the first High-Priority Order ID (${firstHighPriority.order_id}) to process: `, (order_id) => {
            if (order_id === firstHighPriority.order_id) {
                firstHighPriority.status = 'completed';
                saveOrders(orders);
                console.log(`Order ${order_id} (High Priority) completed.\n`);
            } else {
                console.log("Oops! You must process orders in sequence. Please check and try again!\n");
            }
            promptToExitOrContinue(() => processOrder(orders, rl));
        });
    } else if (nonPriorityOrders.length > 0) {
        console.log("No high-priority orders pending. You can now process non-priority orders.");
        const firstNonPriority = nonPriorityOrders[0];
        rl.question(`Enter the first Non-Priority Order ID (${firstNonPriority.order_id}) to process: `, (order_id) => {
            if (order_id === firstNonPriority.order_id) {
                firstNonPriority.status = 'completed';
                saveOrders(orders);
                console.log(`Order ${order_id} (Non-Priority) completed.\n`);
            } else {
                console.log("Oops! Please process the first non-priority order first. Try again!\n");
            }
            promptToExitOrContinue(() => processOrder(orders, rl));
        });
    } else {
        console.log("No pending orders to process.\n");
        mainMenu(orders, rl);
    }
}

/**
 * Adds a new order to the system.
 * Prompts user for order details and saves the order.
 * @param {Array<Order>} orders - Array of orders.
 * @param {readline.Interface} rl - Readline interface for input.
 */
function addOrder(orders, rl) {
    rl.question("Enter Order ID: ", (order_id) => {
        if (orders.some(o => o.order_id === order_id)) {
            console.log(`Error: Order ID ${order_id} already exists.\n`);
            mainMenu(orders, rl);
            return;
        }

        rl.question("Enter Customer Name: ", (customer_name) => {
            rl.question("Enter Items (comma-separated): ", (itemsInput) => {
                rl.question("Is this a High-Priority Order? (yes/no): ", (priorityInput) => {
                    const items = itemsInput.split(',').map(item => item.trim());
                    const is_high_priority = priorityInput.toLowerCase() === 'yes';
                    const newOrder = new Order(order_id, customer_name, items, is_high_priority);

                    orders.push(newOrder);
                    saveOrders(orders);
                    console.log(`Order ${order_id} added successfully.\n`);
                    mainMenu(orders, rl);
                });
            });
        });
    })};

/**
 * mainMenu - Displays the main menu and handles user choices.
 *
 * @param {Array} orders - List of orders in the system.
 * @param {Object} rl - Readline interface for user input/output.
 */
function mainMenu(orders, rl) {
    // Display menu options to the user
    console.log("\n1. Add a new order");
    console.log("2. Process orders");
    console.log("3. View pending orders");
    console.log("4. Exit\n");

    // Prompt user for input choice
    rl.question("Enter your choice: ", (choice) => {
        // Handle the user's input using a switch-case statement
        switch (choice) {
            // Option to add a new order
            case '1':
                addOrder(orders, rl);
                break;
            // Option to process an order
            case '2':
                processOrder(orders, rl);
                break;
            // Option to view pending orders
            case '3':
                showPendingOrders(orders);
                // After showing pending orders, redisplay the menu
                mainMenu(orders, rl);
                break;
            // Option to exit the program
            case '4':
                console.log("Exiting the system. Goodbye!");
                rl.close();
                break;
            // Default case for invalid input
            default:
                console.log("Invalid choice. Please try again.\n");
                mainMenu(orders, rl);
        }
    });
}

/**
 * main - The main entry point of the application.
 */
function main() {
    // Display a welcome message
    console.log("Welcome to the Order Management System!");

    // Load the list of orders (Assumed to be a function not shown in the provided code)
    const orders = loadOrders();

    // Create the readline interface to accept user input
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Display the main menu
    mainMenu(orders, rl);
}
// Call the main function to start the application
main();
