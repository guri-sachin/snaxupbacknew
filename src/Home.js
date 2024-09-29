import { Form, Button, Container, Nav } from 'react-bootstrap';
import React, { Component, useState } from 'react';
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { Route, Link, Router, Routes, Navigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-select/dist/css/bootstrap-select.min.css';

import { fetch } from 'whatwg-fetch';
import Admin from './pages/Admin';
import PropertyList from './pages/PropertyList';
import AddProduct from './pages/AddProduct';
import Login from './pages/Login';  

 
import Contactus from './pages/Contactus';  

import ViewProducts from './pages/ViewProducts';  
import ViewUsers from './pages/ViewUsers';  
import AddGifts from './pages/AddGifts';  
import AddGiftBox from './pages/AddGiftBox';  

import AddCoupn from './pages/AddCoupn';  
import ViewGifts from './pages/ViewGifts';  


import ViewOrders from './pages/ViewOrders';  
import ViewGiftbox from './pages/ViewGiftbox';  


import './App.css';

function Home() {


  return (


    <div>



      <Routes >
        <Route exact path="/Admin" element={<Admin />}></Route>
        <Route exact path="/PropertyList" element={<PropertyList />}></Route>
        <Route exact path="/AddProduct" element={<AddProduct />}></Route>

        {/* <Route exact path="/ViewBlog/:id" element={<ViewBlog />}></Route>  */}
   
        <Route exact path="/Contactus" element={<Contactus />}></Route> 
      
        <Route exact path="/" element={<Login />}></Route> 
        <Route exact path="/ViewProducts" element={<ViewProducts />}></Route> 
        <Route exact path="/ViewUsers" element={<ViewUsers />}></Route>   
        <Route exact path="/ViewOrders" element={<ViewOrders />}></Route>    
        <Route exact path="/AddGifts" element={<AddGifts />}></Route> 
        <Route exact path="/AddGiftBox" element={<AddGiftBox />}></Route>  
        <Route exact path="/AddCoupn" element={<AddCoupn />}></Route> 
        <Route exact path="/ViewGiftbox" element={<ViewGiftbox />}></Route> 
        <Route exact path="/ViewGifts" element={<ViewGifts />}></Route> 

        
        
        
      </Routes> 

    </div>



  );

}

export default Home;
