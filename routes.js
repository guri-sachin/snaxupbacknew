
const express = require('express');
const multer = require('multer');
const axios = require('axios')
const crypto = require("crypto");
const path = require('path');
const db = require('./dbconnection');
const fs = require('fs');
const { parse, format, isValid } = require('date-fns');
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
// const mysql = require('mysql2');
require('dotenv').config();

const router = express.Router();



const SHIPROCKET_BASE_URL = process.env.REACT_APP_SHIPROCKET_BASE_URL;
const merchant_id = process.env.REACT_APP_MERCHANT_ID;
const access_code = process.env.REACT_APP_ACCESS_CODE;
const working_key = process.env.REACT_APP_WORKING_KEY;

// Example usage
console.log('Shiprocket Base URL:', SHIPROCKET_BASE_URL);
console.log('Merchant ID:', merchant_id);

// const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
let token = ''; // Store Shiprocket Token

// const merchant_id = "2621746";   // Replace with your Merchant ID
// const access_code = "AVVH84KG25AF33HVFA";   // Replace with your Access Code
// const working_key = "287B9D94DFD2028076E7EE51127117B3";   // Replace with your Working Key


// Shiprocket API Authentication
async function getAuthToken() {
  const credentials = {
    email: 'wedev@snaxup.com',
    password: 'Sn@xup@2610',
  };

  try {
    const response = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, credentials);
    token = response.data.token; // Save the token
    console.log('Token retrieved successfully:', token);
  } catch (error) {
    console.error('Error retrieving token:', error);
    throw new Error('Authentication failed');
  }
}

// Create Order API Route
router.post('/shiprocket/create-order', async (req, res) => {
  const {
    order_id,
    order_date,
    pickup_location,
    billing_customer_name,
    billing_last_name,
    billing_address,
    billing_city,
    billing_pincode,
    billing_state,
    billing_country,
    billing_email,
    billing_phone,
    shipping_is_billing,
    order_items,
    payment_method,
    sub_total,
    length,
    breadth,
    height,
    weight
  } = req.body; // Destructuring the incoming request body

  // Create the orderData object using the values from req.body
  const orderData = {
    order_id,
    order_date,
    pickup_location,
    billing_customer_name,
    billing_last_name,
    billing_address,
    billing_city,
    billing_pincode,
    billing_state,
    billing_country,
    billing_email,
    billing_phone,
    shipping_is_billing,
    order_items,
    payment_method,
    sub_total,
    length,
    breadth,
    height,
    weight
  };
  try {
    // Check if token is not set or expired
    if (!token) {
      console.log('Token not available, fetching a new token...');
      await getAuthToken(); // Fetch token before creating the order
    }
console.log("token",token)
    const response = await axios.post(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, orderData, {
      headers: { Authorization: `Bearer ${token}` }, // Use the token in the Authorization header
    });

    res.json({ message: 'Order created successfully', data: response.data });
  } catch (error) {
    console.error('Error creating order:', error.response.data);  // Log the full error response
    res.status(500).json({ error: 'Failed to create order', details: error.response.data });
}

});

//api for tracking
router.post('/shiprocket/track-order', async (req, res) => {
  const { awbCode } = req.body;  // AWB code (tracking number) of the shipment
  if (!token) {
    console.log('Token not available, fetching a new token...');
    await getAuthToken(); // Fetch token before creating the order
  }
console.log("token",token)
  try {
    const response = await axios.get(`${SHIPROCKET_BASE_URL}/courier/track/awb/${awbCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json({ message: 'Tracking data fetched', data: response.data });
  } catch (error) {
    console.error('Error tracking shipment:', error);
    res.status(500).json({ error: 'Failed to track shipment' });
  }
});



// Helper function to encrypt data
function encrypt(data, key) {
  // Ensure the key is 16 bytes (128 bits) long
  const formattedKey = key.slice(0, 16).padEnd(16, '0'); // Ensure it is exactly 16 bytes
  
  const iv = crypto.randomBytes(16);  // Initialization Vector
  const cipher = crypto.createCipheriv('aes-128-cbc', formattedKey, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + encrypted;  // Combine IV and encrypted data in base64
}

// Example use of the encrypt function
const encryptedData = encrypt("test data", working_key);
console.log(encryptedData);
// Helper function to decrypt data
function decrypt(data, key) {
  const iv = Buffer.from(data.slice(0, 32), 'hex');
  const encryptedText = data.slice(32);
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// API endpoint to initiate payment
router.post("/payment", (req, res) => {
  const { amount, order_id, customer_id, redirect_url, cancel_url } = req.body;

  const data = {
    merchant_id: merchant_id,
    order_id: order_id,
    currency: 'INR',
    amount: amount,
    redirect_url: redirect_url,
    cancel_url: cancel_url,
    language: 'EN',
    billing_name: "John Doe",
    billing_address: "Address",
    billing_city: "City",
    billing_state: "State",
    billing_zip: "123456",
    billing_country: "India",
    billing_tel: "1234567890",
    billing_email: "email@example.com",
  };

  // Serialize the object into query string format
  const serializedData = new URLSearchParams(data).toString();
  console.log("Serialized Data: ", serializedData);

  // Encrypt the serialized data
  const encryptedData = encrypt(serializedData, working_key);
  console.log("Encrypted Data: ", encryptedData);
  console.log("Access Code: ", access_code);

  // Send the encrypted data and access code to the frontend
  res.json({
    encryptedData: encryptedData,
    accessCode: access_code,
  });
});

// API endpoint to handle response from CC Avenue
router.post("/api/payment/response", (req, res) => {
  const { encResp } = req.body;
  const decryptedData = decrypt(encResp, working_key);
  // Handle the decrypted response data, e.g., success or failure
  res.json({ status: "success", data: decryptedData });
});


// Serve static files from public/images
router.use('/images', express.static(path.join(__dirname, 'public/images')));

// Set up multer storage
const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'public/images')); // Save files to public/images
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to file names
    }
  })
});



// API endpoint to get data based on ID 
router.get('/products/:id', (req, res) => {
  const id = req.params.id;

  // Query to join the three tables and get data based on ID
  const query = `
    SELECT 
        products.id AS product_id,
        products.short AS product_short,
        products.title AS product_title,
        products.des AS product_des,
        products.points AS product_points,
        products.categores AS product_categores,
        products.sku AS product_sku,
        products.price AS product_price,
        products.size AS product_size,
        products.img AS product_img,
        products.feature_img AS feature_img,
        products.slug AS product_slug,
        products.points AS products_points,


         review.id AS review_id,
         review.msg AS review_message,
         review.email AS review_email,
      review.rating AS review_rating,
       actualp.p_price AS product_p_price,
              actualp.seoTitle AS seoTitle,
              actualp.seoDes AS seoDes,
                            actualp.seoKeyword AS seoKeyword,
                            actualp.PageName AS PageName,


       actualp.p_pice AS product_p_pice,
      actualp.editor AS actualp_editor,

        actualp.p_discount AS product_p_discount,
                    actualp.gifts_price AS gifts_price


    FROM 
      products
    LEFT JOIN 
      review ON products.id = review.p_id
    LEFT JOIN 
      actualp ON products.id = actualp.p_id
    WHERE 
      products.id = ?;
  `;

  // Execute the query
  db.query(query, [id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Send results as response
    res.json(results);
  });
});


//to get all products 
router.get('/products', async (req, res) => {
  // Query to join the three tables and get all data
  const query = `
    SELECT 
      products.id AS product_id,
      products.short AS product_short,
      products.title AS product_title,
      products.des AS product_des,
      products.points AS product_points,
      products.categores AS product_categores,
      products.sku AS product_sku,
      products.price AS product_price, -- Original product price
      products.size AS product_size,
      products.img AS product_img,
      products.feature_img AS product_feature_img,
      products.slug AS product_slug,
      
      review.id AS review_id,
      review.msg AS review_message,
      review.email AS review_email,
      review.rating AS review_rating,

      actualp.p_price AS actualp_price, -- Renamed to avoid conflict
      actualp.p_pice AS actualp_piece,  -- Assuming this is 'p_price'
      actualp.p_discount AS actualp_discount,
      actualp.editor AS actualp_editor,
      actualp.seoTitle AS actualp_seoTitle,
      actualp.seoDes AS actualp_seoDes,
      actualp.seoKeyword AS actualp_seoKeyword,
      actualp.PageName AS actualp_PageName,
            actualp.gifts_price AS gifts_price

      
    FROM 
      products
    LEFT JOIN 
      review ON products.id = review.p_id
    LEFT JOIN 
      actualp ON products.id = actualp.p_id;
  `;

  try {
    // Execute the query
    db.query(query, (error, results) => {
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // If query is successful, return the results
      res.json(results);
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Unexpected Server Error' });
  }
});

//to get all chocolate 
router.get('/chocolate-products', async (req, res) => {
  // Query to join the three tables and get data where category is "chocolate"
  const query = `
    SELECT 
      products.id AS product_id,
      products.short AS product_short,
      products.title AS product_title,
      products.des AS product_des,
      products.points AS product_points,
      products.categores AS product_categores,
      products.sku AS product_sku,
      products.price AS product_price, -- Original product price
      products.size AS product_size,
      products.img AS product_img,
      products.feature_img AS product_feature_img,
      products.slug AS product_slug,
      
      review.id AS review_id,
      review.msg AS review_message,
      review.email AS review_email,
      review.rating AS review_rating,

      actualp.p_price AS actualp_price, -- Renamed to avoid conflict
      actualp.p_pice AS actualp_piece,  -- Assuming this is 'p_price'
      actualp.p_discount AS actualp_discount,
      actualp.editor AS actualp_editor,
      actualp.seoTitle AS actualp_seoTitle,
      actualp.seoDes AS actualp_seoDes,
      actualp.seoKeyword AS actualp_seoKeyword,
      actualp.PageName AS actualp_PageName,
      actualp.gifts_price AS gifts_price
      
    FROM 
      products
    LEFT JOIN 
      review ON products.id = review.p_id
    LEFT JOIN 
      actualp ON products.id = actualp.p_id
    WHERE 
      products.categores = 'chocolate';  -- Filter products with category "chocolate"
  `;

  try {
    // Execute the query
    db.query(query, (error, results) => {
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // If query is successful, return the results
      res.json(results);
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Unexpected Server Error' });
  }
});
// Get latest 8 products excluding 'chocolate' category
router.get('/products/latest/new', async (req, res) => {
  // Query to join the three tables, exclude "chocolate" category, and get the latest 8 products
  const query = `
    SELECT 
      products.id AS product_id,
      products.short AS product_short,
      products.title AS product_title,
      products.des AS product_des,
      products.points AS product_points,
      products.categores AS product_categores,
      products.sku AS product_sku,
      products.price AS product_price,
      products.size AS product_size,
      products.img AS product_img,
      products.feature_img AS product_feature_img,
      products.slug AS product_slug,
      
      review.id AS review_id,
      review.msg AS review_message,
      review.email AS review_email,
      review.rating AS review_rating,

      actualp.p_price AS actualp_price, 
      actualp.p_pice AS actualp_piece, 
      actualp.p_discount AS actualp_discount,
      actualp.editor AS actualp_editor,
      actualp.seoTitle AS actualp_seoTitle,
      actualp.seoDes AS actualp_seoDes,
      actualp.seoKeyword AS actualp_seoKeyword,
      actualp.PageName AS actualp_PageName,
      actualp.gifts_price AS gifts_price
      
    FROM 
      products
    LEFT JOIN 
      review ON products.id = review.p_id
    LEFT JOIN 
      actualp ON products.id = actualp.p_id
    WHERE 
      products.categores != 'chocolate'  
    ORDER BY 
      products.id DESC 
    LIMIT 8;
  `;

  try {
    // Execute the query
    db.query(query, (error, results) => {
      if (error) {
        console.error('Database query error:', error); // Log the error if query fails
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // Log the results returned from the query
      console.log('Query results:', results);

      if (results.length === 0) {
        console.log('No products found');
        return res.status(404).json({ message: 'No products found' });
      }

      // If query is successful, return the results
      res.json(results);
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error:', error); // Log unexpected error
    res.status(500).json({ error: 'Unexpected Server Error' });
  }
});


// POST endpoint to upload product data with images
router.post('/products', upload.fields([
  { name: 'img', maxCount: 5 }, // Multiple images (max 5)
  { name: 'feature_img', maxCount: 1 } // Single feature image
]), async (req, res) => {
  const {
    product_short,
    product_title,
    product_des,
    product_points,
    product_categores,
    product_sku,
    product_price,
    product_size,
    product_slug,
    review_message,
    review_email,
    review_rating,
    product_p_price,
    product_p_pice,
    product_p_discount,
    product_p_taxes,
    product_p_seoTitle,
    product_p_seoDes,
    product_p_seoKeyword,
    product_p_PageName,
    product_p_editor,
    gifts_price
  } = req.body;

  // Debugging: Log uploaded files and form data
  console.log('Uploaded files:', req.files);
  console.log('Form data:', req.body);

  // Extracting uploaded files
  const images = req.files['img'] ? req.files['img'].map(file => file.filename) : [];
  const featureImage = req.files['feature_img'] ? req.files['feature_img'][0].filename : null;

  // Build URLs for the uploaded images
  const baseUrl = `${req.protocol}://${req.get('host')}/images/`;
  const imageUrls = images.map(img => baseUrl + img);
  const featureImageUrl = featureImage ? baseUrl + featureImage : null;
console.log("url",imageUrls,baseUrl,featureImageUrl)
  // Queries to insert data
  const productQuery = `
    INSERT INTO products (short, title, des, points, categores, sku, price, size, img, feature_img, slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const reviewQuery = `
    INSERT INTO review (p_id, msg, email, rating)
    VALUES (?, ?, ?, ?)
  `;
  const actualPriceQuery = `
    INSERT INTO actualp (p_id, p_price, p_pice, p_discount, taxes, seoTitle, seoDes, seoKeyword, PageName, editor, gifts_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    db.beginTransaction((transactionError) => {
      if (transactionError) {
        console.error('Transaction Error:', transactionError);
        return res.status(500).json({ error: 'Transaction Error' });
      }

      // Insert product data
      db.query(productQuery, [
        product_short, product_title, product_des, product_points, product_categores,
        product_sku, product_price, product_size, JSON.stringify(imageUrls), featureImageUrl, product_slug
      ], (productError, productResult) => {
        if (productError) {
          return db.rollback(() => {
            console.error('Product Insertion Error:', productError);
            res.status(500).json({ error: 'Product Insertion Error' });
          });
        }

        const productId = productResult.insertId;
        console.log('Product inserted, ID:', productId);

        // Insert review data
        db.query(reviewQuery, [productId, review_message, review_email, review_rating], (reviewError) => {
          if (reviewError) {
            return db.rollback(() => {
              console.error('Review Insertion Error:', reviewError);
              res.status(500).json({ error: 'Review Insertion Error' });
            });
          }

          // Insert actual pricing data
          db.query(actualPriceQuery, [productId, product_p_price, product_p_pice, product_p_discount, product_p_taxes, product_p_seoTitle, product_p_seoDes,
            product_p_seoKeyword, product_p_PageName, product_p_editor, gifts_price], (priceError) => {
            if (priceError) {
              return db.rollback(() => {
                console.error('Pricing Insertion Error:', priceError);
                res.status(500).json({ error: 'Pricing Insertion Error' });
              });
            }

            // Commit the transaction if all queries are successful
            db.commit((commitError) => {
              if (commitError) {
                return db.rollback(() => {
                  console.error('Commit Error:', commitError);
                  res.status(500).json({ error: 'Commit Error' });
                });
              }

              res.status(201).json({
                message: 'Product data uploaded successfully',
                images: imageUrls,
                featureImage: featureImageUrl
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Unexpected Server Error:', error);
    res.status(500).json({ error: 'Unexpected Server Error' });
  }
});


// DELETE route to remove a product by ID
router.delete('/products/:id', async (req, res) => {
  // Extract the product ID from the request parameters
  const productId = req.params.id;

  // SQL queries to delete from all related tables
  const deleteProductQuery = `DELETE FROM products WHERE id = ?`;
  const deleteReviewsQuery = `DELETE FROM review WHERE p_id = ?`;
  const deleteActualpQuery = `DELETE FROM actualp WHERE p_id = ?`;

  // Start a transaction
  try {
    // Begin transaction
    db.query('START TRANSACTION');

    // Execute delete queries
    db.query(deleteReviewsQuery, [productId]);
    db.query(deleteActualpQuery, [productId]);
    db.query(deleteProductQuery, [productId]);

    // Commit transaction
    db.query('COMMIT');

    // If deletion is successful, send a success response
    res.status(200).json({ message: 'Product and related entries successfully deleted' });
  } catch (error) {
    // Rollback transaction in case of an error
    db.query('ROLLBACK');

    // Handle error
    console.error('Database transaction error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Define the login route
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).send({ error: 'Identifier and password are required' });
  }

  try {
    // Check if the identifier is an email or a phone number
    const isEmail = identifier.includes('@');
    const checkUserSql = isEmail
      ? 'SELECT * FROM signup WHERE email = ?'
      : 'SELECT * FROM signup WHERE phone = ?'; // Check phone if it's not an email

    db.query(checkUserSql, [identifier], async (err, results) => {
      if (err) {
        console.error('Error checking user:', err);
        return res.status(500).send({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).send({ error: 'Invalid email/phone or password' });
      }

      const user = results[0];

      // Compare the provided password with the hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).send({ error: 'Invalid email/phone or password' });
      }

      res.status(200).send({ message: 'Login successful', userId: user.id });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});


router.post('/signup', async (req, res) => {
  const { fullname, phone, email, password } = req.body;

  if (!fullname || !email || !password || !phone) {
    return res.status(400).json({ message: 'Please fill in all required fields' });
  }

  try {
    // Check if the email or phone already exists in the database
    const checkQuery = 'SELECT * FROM signup WHERE email = ? OR phone = ?';
    db.query(checkQuery, [email, phone], async (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }

      if (result.length > 0) {
        // If a user with the same email or phone exists
        return res.status(400).json({ message: 'Email or phone number already exists' });
      }

      // If no existing user is found, proceed with registration
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user data into the database
      const insertQuery = 'INSERT INTO signup (fullname, phone, email, password) VALUES (?, ?, ?, ?)';
      db.query(insertQuery, [fullname, phone, email, hashedPassword], (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Database error during registration', error: err });
        }
        
        // Return user ID along with the success message
        const userId = result.insertId;  // Extract the user ID from the insert operation
        res.status(200).json({ message: 'User registered successfully', userId });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error in user registration', error });
  }
});

// POST route to create a new coupon
router.post('/create-coupon', (req, res) => {
  const { discount, qty, amount, code, categore } = req.body;

  // Basic validation
  if (!discount || !qty || !amount || !code ) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // SQL query to insert the new coupon into the database
  const sql = 'INSERT INTO coupon (discount, qty, amount, code, categore) VALUES (?, ?, ?, ?, ?)';

  // Execute the query
  db.query(sql, [discount, qty, amount, code, categore], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Error saving coupon to the database.' });
    }

    // Respond with success message
    res.status(200).json({ message: 'Coupon created successfully!', couponId: result.insertId });
  });
});

// POST route to validate a coupon
router.post('/validate-coupon', (req, res) => {
  const { code, category, orderAmount } = req.body;

  // Validate input
  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required.' });
  }

  // SQL query to find the coupon by code
  const sql = 'SELECT * FROM coupon WHERE code = ? LIMIT 1';

  // Execute the query
  db.query(sql, [code], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Error validating the coupon.' });
    }

    if (results.length === 0) {
      // Coupon not found
      return res.status(404).json({ error: 'Invalid coupon code.' });
    }

    const coupon = results[0];

    // // Check if the coupon category matches
    // if (coupon.category !== 'All' && coupon.category !== category) {
    //   return res.status(400).json({ error: 'Coupon is not valid for this category.' });
    // }

    // // Check if the coupon has any remaining quantity
    // if (coupon.qty <= 0) {
    //   return res.status(400).json({ error: 'Coupon usage limit has been reached.' });
    // }

    // Check if the order amount meets the minimum requirement
    if (coupon.amount > orderAmount) {
      return res.status(400).json({ error: `Minimum order amount to apply this coupon is ${coupon.amount}.` });
    }

    // If all checks pass, return a success message with discount percentage
    return res.status(200).json({
      message: 'Coupon is valid!',
      discount: coupon.discount, // assuming this is a percentage
    });
  });
});

module.exports = router;


// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: "surbhigulhana3@gmail.com", // Set this in your .env file
    pass: "hsae ltyz ogjq dbox" // Set this in your .env file
  }
});

//api for contactus  
router.post('/send-contactus', (req, res) => {
  const { name, msg, email, phone } = req.body;

  // Save email to database
  const sql = 'INSERT INTO contactus (name, msg, email, phone) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, msg, email, phone], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Error saving to database.');
    }

    // Send email
    const mailOptions = {
      from: email, // Change this to your email address
      to: "surbhigulhana3@gmail.com",
      subject: 'New Inquiry',
      text: `Name: ${name}\nMessage: ${msg}\nPhone: ${phone}\nEmail: ${email}`

    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email error:', error);
        return res.status(500).send('Error sending email.');
      }
      res.status(200).send('Email sent and saved successfully.');
    });
  });
});

router.post('/send-subscribe', (req, res) => {
  const { email } = req.body;

  // Check if email already exists in the database
  const checkEmailQuery = 'SELECT * FROM subscribe WHERE email = ?';
  db.query(checkEmailQuery, [email], (err, results) => {
    if (err) {
      console.error('Database error during email check:', err);
      return res.status(500).send('Error checking email in database.');
    }

    // If email already exists, send response
    if (results.length > 0) {
      return res.status(409).send('Email already exists.');
    }

    // If email does not exist, insert it into the database
    const insertEmailQuery = 'INSERT INTO subscribe (email) VALUES (?)';
    db.query(insertEmailQuery, [email], (err, result) => {
      if (err) {
        console.error('Database error during insert:', err);
        return res.status(500).send('Error saving email to database.');
      }

      // Send email
      const mailOptions = {
        from: email, // Change this to your email address
        to: 'surbhigulhana3@gmail.com',
        subject: 'New Subscription',
        text: `A new subscription has been received: \nEmail: ${email}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email error:', error);
          return res.status(500).send('Error sending email.');
        }
        res.status(200).send('Email sent and saved successfully.');
      });
    });
  });
});



// Get all contacts
router.get('/contactus', async (req, res) => {
  try {
    const query = 'SELECT * FROM contactus';
    db.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// Get all users
router.get('/signup', async (req, res) => {
  try {
    const query = 'SELECT * FROM signup';
    db.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});


// DELETE a user by ID
router.delete('/signup/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // SQL query to delete a user by ID
    const query = 'DELETE FROM signup WHERE id = ?';
    
    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json({ message: `User with ID ${userId} deleted successfully` });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// POST route to upload data to the gifts table
router.post('/gifts', upload.fields([
  { name: 'feature_img', maxCount: 1 },   // Single image for feature_img
  { name: 'img', maxCount: 6 }            // Multiple images for img (5-6)
]), (req, res) => {
  const { title, short, des, detaildes, points, price, mrp, seoTitle,seoDes,seoKeyword,PageName,tax,discount,slug,categore } = req.body;

  // Check if files are uploaded
  if (!req.files.feature_img || !req.files.img) {
    return res.status(400).json({ error: 'Please upload images for feature_img and img fields.' });
  }

  // Extracting uploaded files
  const images = req.files['img'] ? req.files['img'].map(file => file.filename) : [];
  const featureImage = req.files['feature_img'] ? req.files['feature_img'][0].filename : null;

  // Debug log to ensure proper images are being processed
  console.log("Uploaded files: ", req.files);
  console.log("Multiple images: ", images);
  console.log("Feature image: ", featureImage);

  // Build URLs for the uploaded images
  const baseUrl = `${req.protocol}://${req.get('host')}/images/`;  // Assuming images are in 'uploads' folder
  const imageUrls = images.map(img => baseUrl + img);
  const featureImageUrl = featureImage ? baseUrl + featureImage : null;

  // Log the URLs being generated
  console.log("URL for multiple images:", imageUrls);
  console.log("URL for feature image:", featureImageUrl);

  // SQL query to insert data
  const query = `INSERT INTO gifts (title, short, des, detaildes, points, feature_img, img, price, mrp, seoTitle,seoDes,seoKeyword,PageName,tax, discount, slug, categore) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  // Execute the query
  db.query(query, [title, short, des, detaildes, points, featureImageUrl, JSON.stringify(imageUrls), price, mrp, seoTitle,seoDes,seoKeyword,PageName,tax,discount,slug,categore], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      res.status(500).send('Error inserting data');
    } else {
      res.status(201).send('Gift data inserted successfully with images');
    }
  });
});

// Get all gifts data
router.get('/Allgifts', (req, res) => {
  // SQL query to fetch all gift data
  const query = `SELECT * FROM gifts`;

  // Execute the query
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching gifts:', err);
      return res.status(500).json({ error: 'Error fetching gifts data' });
    }

    // Check if there are no results
    if (results.length === 0) {
      return res.status(404).json({ message: 'No gifts found' });
    }

    // Send the gift details in the response
    res.status(200).json(results);
  });
});

// DELETE a gift by ID
router.delete('/DeletGift/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // SQL query to delete a user by ID
    const query = 'DELETE FROM gifts WHERE id = ?';
    
    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json({ message: `User with ID ${userId} deleted successfully` });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});



// Get gift by ID
router.get('/gifts/:id', (req, res) => {
  const giftId = req.params.id;

  // SQL query to fetch the gift details by ID
  const query = `SELECT * FROM gifts WHERE id = ?`;

  // Execute the query
  db.query(query, [giftId], (err, results) => {
    if (err) {
      console.error('Error fetching gift:', err);
      return res.status(500).json({ error: 'Error fetching gift data' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Gift not found' });
    }

    // Send the gift details in the response
    res.status(200).json(results[0]);
  });
});



// POST route to upload data to the gifts box
router.post('/gifts_box', upload.fields([
  { name: 'img', maxCount: 1 },   // Single image for feature_img
]), (req, res) => {
  const { title, size, space, box_price, mrp } = req.body;

  // Check if files are uploaded
  if (!req.files.img) {
    return res.status(400).json({ error: 'Please upload images for feature_img and img fields.' });
  }

  // Extracting uploaded files
  const featureImage = req.files['img'] ? req.files['img'][0].filename : null;

  // Build URLs for the uploaded images
  const baseUrl = `${req.protocol}://${req.get('host')}/images/`;  // Assuming images are in 'uploads' folder
  const featureImageUrl = featureImage ? baseUrl + featureImage : null;

  // Log the URLs being generated
  console.log("URL for feature image:", featureImageUrl);

  // SQL query to insert data
  const query = `INSERT INTO custom_box (title, size, space, box_price, img, mrp) VALUES (?, ?, ?, ?, ?, ?)`;

  // Execute the query
  db.query(query, [title, size, space,box_price, featureImageUrl, mrp], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      res.status(500).send('Error inserting data');
    } else {
      res.status(201).send('Gift data inserted successfully with images');
    }
  });
});

// GET route to fetch a specific gift box by ID
router.get('/gifts_box/:id', (req, res) => {
  const giftBoxId = req.params.id;

  // SQL query to fetch the specific gift box by ID
  const query = `SELECT * FROM custom_box WHERE id = ?`;

  db.query(query, [giftBoxId], (err, result) => {
    if (err) {
      console.error('Error fetching gift box data:', err);
      return res.status(500).send('Error fetching data');
    }

    if (result.length === 0) {
      return res.status(404).send('Gift box not found');
    }

    res.status(200).json(result[0]); // Return the gift box data
  });
});



// Get all gifts data
router.get('/Allcustom_box', (req, res) => {
  // SQL query to fetch all gift data
  const query = `SELECT * FROM custom_box`;

  // Execute the query
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching gifts:', err);
      return res.status(500).json({ error: 'Error fetching gifts data' });
    }

    // Check if there are no results
    if (results.length === 0) {
      return res.status(404).json({ message: 'No gifts found' });
    }

    // Send the gift details in the response
    res.status(200).json(results);
  });
});

// DELETE a user by ID
router.delete('/Allboxs/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // SQL query to delete a user by ID
    const query = 'DELETE FROM custom_box WHERE id = ?';
    
    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json({ message: `User with ID ${userId} deleted successfully` });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});



// POST route to upload banner images to the homebanner table
router.post('/home-banners', upload.fields([
  { name: 'firstBanner', maxCount: 1 },  // Upload single file for firstBanner

]), (req, res) => {
  
  // Check if files are uploaded
  if (!req.files.firstBanner ) {
    return res.status(400).json({ error: 'Please upload all three banners' });
  }

  // Extract filenames from req.files
  const firstBanner = req.files['firstBanner'][0].filename;

  // Build URLs for the uploaded images
  const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
  const firstBannerUrl = baseUrl + firstBanner;

  // SQL query to insert data into the homebanner table
  const query = `INSERT INTO homebanner (firstBanner) VALUES (?)`;

  // Execute the query
  db.query(query, [firstBannerUrl], (err, result) => {
    if (err) {
      console.error('Error inserting banner images:', err);
      res.status(500).send('Error inserting banner images');
    } else {
      res.status(201).json({
        message: 'Banner images uploaded and stored successfully',
        data: {
          firstBanner: firstBannerUrl,
      
        }
      });
    }
  });
});

//for user
const sendEmailToUser = async (userEmail, orderId, items) => {
  const mailOptions = {
    from: 'surbhigulhana3@gmail.com',
    to: userEmail,
    subject: `Order Confirmation #${orderId}`,
    html: `<p>Thank you for your order!</p>
           <p>Order ID: ${orderId}</p>
           <p>Items: ${items.map(item => `${item.title} (Qty: ${item.quantity})`).join(', ')}</p>
           <p>Happy shopping!
           Thank you for your purchase! 🎉
We hope you enjoy your new items. Your order is on its way, and we're excited to be part of your shopping journey! If you need anything, we're here to help. Have a great day and happy shopping! 🛒😊
Don't forget to check back for more great deals and surprises! ✨</p>`
  };

  await transporter.sendMail(mailOptions);
};

//for shipping and admin

const sendEmailToAdminAndDeliveryPartner = async (orderId, userEmail, items, address) => {
  const mailOptions = {
    from: 'surbhigulhana3@gmail.com',
    to: ['guriguriguri333th@gmail.com', 'gurisachin09@gmail.com'],
    subject: `New Order #${orderId}`,
    html: `
      <p>A new order has been placed by ${userEmail}.</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Items:</strong> ${items.map(item => `${item.title} (Qty: ${item.quantity})`).join(', ')}</p>
      <p><strong>Pickup Location:</strong></p>
      <p><strong>Drop Location (Customer's Address):</strong></p>
      <p>${address.addressLine1}, ${address.addressLine2 ? address.addressLine2 + ', ' : ''}${address.city}, ${address.provience}, ${address.postalCode}, ${address.country}</p>
    `
  };

  await transporter.sendMail(mailOptions);
};
      // <p>${pickupLocation.addressLine1}, ${pickupLocation.addressLine2 ? pickupLocation.addressLine2 + ', ' : ''}${pickupLocation.city}, ${pickupLocation.provience}, ${pickupLocation.postalCode}, ${pickupLocation.country}</p>


// POST route to create a new order with guest user management
router.post('/orders', async (req, res) => {
  const { email, phone, totalAmount, discount, paymentMethod, address,afterdiscount, items } = req.body;
  let userId = null;

  try {
    // Step 1: Check if a user exists by email or phone
    const checkUserQuery = `SELECT id FROM signup WHERE email = ? OR phone = ?`;
    
    // Await the query to ensure it's properly resolved
    const [existingUser] = await db.promise().query(checkUserQuery, [email, phone]);

    if (existingUser.length > 0) {
      // If user exists, use their user_id
      userId = existingUser[0].id;
    } else {
      // If user doesn't exist, create a new user
      const createUserQuery = `INSERT INTO signup (email, phone) VALUES (?, ?)`;
      const [createUserResult] = await db.promise().query(createUserQuery, [email, phone]);
      userId = createUserResult.insertId;
    }

    // Step 2: Insert the address (either new or existing logic as previously shown)
    const { addressLine1, addressLine2, city, provience, postalCode, country, address_type } = address;
    const insertAddressQuery = `
      INSERT INTO addresses (user_id, address_line_1, address_line_2, city, provience, postal_code, country, phone, address_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Await the query to insert the address and get the inserted address ID
    const [insertAddressResult] = await db.promise().query(insertAddressQuery, [
      userId, addressLine1, addressLine2, city, provience, postalCode, country, phone, address_type
    ]);
    
    const addressId = insertAddressResult.insertId;

    // Step 3: Insert the order details
    const orderQuery = `INSERT INTO orders (user_id, total_amount, discount, order_status, payment_method, address_id,afterdiscount) VALUES (?, ?, ?, ?, ?, ?,?)`;
    const [orderResult] = await db.promise().query(orderQuery, [userId, totalAmount, discount, 'pending', paymentMethod, addressId, afterdiscount]);
    
    const orderId = orderResult.insertId;

    // Step 4: Insert the order items
    const orderItemsQuery = `INSERT INTO order_items (order_id, product_id, quantity, size, price, img,title) VALUES ?`;
    const orderItemsData = items.map(item => [orderId, item.productId, item.quantity, item.size, item.price, item.img, item.title]);

    // Await the query for inserting order items
    await db.promise().query(orderItemsQuery, [orderItemsData]);
    // Step 5: Trigger email notifications
    await sendEmailToAdminAndDeliveryPartner(orderId, email, items,address);
    await sendEmailToUser(email, orderId, items);

    res.status(201).send({ message: 'Order created successfully', orderId });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error creating order' });
  }
});




// GET route to retrieve order details by order ID
router.get('/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;

  // Validate orderId
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    // Query to get the order details along with user and items
    const orderQuery = `
      SELECT 
        o.id AS orderId, 
        o.total_amount AS totalAmount, 
        o.discount, 
        o.payment_method AS paymentMethod, 
        a.address_line_1 AS addressLine1, 
        a.city, 
        a.provience, 
        a.postal_code AS postalCode, 
        a.country,
        GROUP_CONCAT(CONCAT(oi.product_id, ':', oi.quantity, ':', oi.size, ':', oi.price) ORDER BY oi.id) AS items
      FROM 
        orders o
      JOIN 
        addresses a ON o.address_id = a.id
      JOIN 
        order_items oi ON o.id = oi.order_id
      WHERE 
        o.id = ?
      GROUP BY 
        o.id
    `;

    // Execute the query
    const [rows] = await db.promise().query(orderQuery, [orderId]);

    // Check if the order exists
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Return the order details
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'An error occurred while fetching the order details' });
  }
});

// GET route to retrieve all orders for a user by user ID
router.get('/orders/user/:userId', async (req, res) => {
  const { userId } = req.params;

  // Validate userId
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Query to get all orders for the user along with the order details and items
    const ordersQuery = `
      SELECT 
        o.id AS orderId, 
        o.total_amount AS totalAmount, 
          o.afterdiscount, 
        o.discount, 
        o.payment_method AS paymentMethod, 
        o.order_status AS orderStatus,
        a.address_line_1 AS addressLine1, 
        a.city, 
        a.provience, 
        a.postal_code AS postalCode, 
        a.country,
    
        GROUP_CONCAT(CONCAT(oi.product_id, ';', oi.quantity, ';', oi.size, ';', oi.price, ';', oi.img, ';', oi.title) ORDER BY oi.id) AS items
      FROM 
        orders o
      JOIN 
        addresses a ON o.address_id = a.id
      JOIN 
        order_items oi ON o.id = oi.order_id
      WHERE 
        o.user_id = ?
      GROUP BY 
        o.id
    `;

    // Execute the query
    const [rows] = await db.promise().query(ordersQuery, [userId]);
// Debugging: Log rows to see if img data is present
console.log("Fetched orders:", rows);

    // Check if the user has any orders
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No orders found for this user' });
    }

    // Return the order details
    res.status(200).json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'An error occurred while fetching the user orders' });
  }
});



// DELETE route to delete an order and its associated records
router.delete('/Deleteorders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body; // Extract the reason from the request body

  // Validate orderId and reason
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }
  if (!reason) {
    return res.status(400).json({ error: 'Reason for deletion is required' });
  }

  try {
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    // Fetch the order details to backup
    const orderDetailsQuery = `
      SELECT 
        oi.product_id, 
        o.id AS order_id, 
        o.user_id 
      FROM 
        orders o 
      JOIN 
        order_items oi ON o.id = oi.order_id 
      WHERE 
        o.id = ?`;

    const [orderDetails] = await connection.query(orderDetailsQuery, [orderId]);

    // Backup the order items before deletion
    for (const detail of orderDetails) {
      const backupQuery = `
        INSERT INTO order_backup (product_id, order_id, user_id, reason) 
        VALUES (?, ?, ?, ?)`;
      await connection.query(backupQuery, [detail.product_id, detail.order_id, detail.user_id, reason]);
    }

    // Delete from order_items table
    const deleteOrderItemsQuery = `DELETE FROM order_items WHERE order_id = ?`;
    await connection.query(deleteOrderItemsQuery, [orderId]);

    // Delete from orders table
    const deleteOrderQuery = `DELETE FROM orders WHERE id = ?`;
    const [deleteOrderResult] = await connection.query(deleteOrderQuery, [orderId]);

    // Check if the order was deleted
    if (deleteOrderResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    // Delete from addresses table (if necessary)
    const deleteAddressQuery = `DELETE FROM addresses WHERE id = (SELECT address_id FROM orders WHERE id = ?)`;
    await connection.query(deleteAddressQuery, [orderId]);

    // Commit the transaction
    await connection.commit();

    // Return success response
    res.status(200).json({ message: 'Order and related records deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    await connection.rollback();
    res.status(500).json({ error: 'An error occurred while deleting the order' });
  } finally {
    // Ensure that connection is released back to the pool
    if (connection) {
      connection.release();
    }
  }
});


// API to get all orders data
router.get('/Allorders', async (req, res) => {
  try {
    // Query to get all orders along with user and address details
    const query = `
      SELECT o.id AS orderId, o.total_amount, o.discount, o.order_status, o.payment_method, 
             u.fullname, u.phone,u.email, a.address_line_1, a.city, a.provience, a.postal_code, a.country
      FROM orders o
      JOIN signup u ON o.user_id = u.id
      JOIN addresses a ON o.address_id = a.id
    `;

    // Await the query to get the orders
    const [orders] = await db.promise().query(query);

    // Check if any orders were found
    if (orders.length === 0) {
      return res.status(404).send({ message: 'No orders found' });
    }

    // Return the orders data
    res.status(200).send(orders);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error retrieving orders data' });
  }
});


// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
};

// POST route to send OTP
router.post('/send-otp', (req, res) => {
  const { email } = req.body;

  // Check if email exists
  db.query('SELECT * FROM signup WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).send('Database error');

    const otp = generateOTP();
    const otpExpiry = new Date(new Date().getTime() + 15 * 60000); // OTP valid for 15 mins

    if (results.length === 0) {
      // Insert new user
      db.query('INSERT INTO signup (email, otp, otp_expiry) VALUES (?, ?, ?)', [email, otp, otpExpiry], (err) => {
        if (err) return res.status(500).send('Database insert error');
      });
    } else {
      // Update existing user OTP and expiry
      db.query('UPDATE signup SET otp = ?, otp_expiry = ? WHERE email = ?', [otp, otpExpiry, email], (err) => {
        if (err) return res.status(500).send('Database update error');
      });
    }

    // Send OTP email
    const mailOptions = {
      from: "surbhigulhana3@gmail.com",
      to: email,
      subject: 'Your OTP for Login',
      text: `Your OTP is ${otp}. It is valid for 15 minutes.`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) return res.status(500).send('Failed to send OTP email');
      res.status(200).send('OTP sent to email');
    });
  });
});

// POST route to verify OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  // Check if OTP is valid
  db.query('SELECT * FROM signup WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).send('Database error');

    if (results.length === 0) return res.status(400).send('User not found');

    const user = results[0];
    const currentTime = new Date();

    if (user.otp !== otp) {
      return res.status(400).send('Invalid OTP');
    }

    if (currentTime > new Date(user.otp_expiry)) {
      return res.status(400).send('OTP expired');
    }

    // Successful OTP verification
    res.status(200).send({ message: 'OTP verified successfully', userId: user.id });
  });
});





module.exports = router;
