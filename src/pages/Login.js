import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../Dyv.css'; // Assuming this file contains your custom styles

function Product() {
  const baseUrl = process.env.REACT_APP_BASE_URL;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:4000/api/login', {
        email,
        password,
      });

      // Assuming your backend returns a status or message indicating success
      if (response.status === 200) {
        // Store data in sessionStorage or localStorage
        sessionStorage.setItem('userData', JSON.stringify(response.data));

        // Redirect to '/Admin' route upon successful login
        navigate('/Admin');
      } else {
        // Handle invalid login scenario
        Swal.fire({
          icon: 'warning',
          text: 'Wrong email or password',
        });
      }
    } catch (error) {
      // Handle network errors or other exceptions
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        text: 'Failed to log in. Please try again.',
      });
    }
  };

  return (
    <div>
      <div className="wrapper fadeInDown">
        <div id="formContent">
          <h2 className="active">Sign in</h2>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              id="pswd"
              className="fadeIn second forniputdyv"
              name="email"
              placeholder="Email"
              value={email}
              onChange={handleEmailChange}
              required
            />
            <small id="emailHelp" className="form-text text-muted">
              We'll never share your email with anyone else.
            </small>
            <input
              type="text"
              id="password"
              className="fadeIn third forniputdyv"
              name="password"
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              required
            />

            <input type="submit" className="fadeIn fourth" value="Submit" />
          </form>
        </div>
      </div>
    </div>
  );
}

export default Product;
