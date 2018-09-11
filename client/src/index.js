import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import Login from './Login';
import registerServiceWorker from './registerServiceWorker';

fetch('/api/loggedin')
  .then(res => {
    if(res.data) {
      ReactDOM.render(<App />, document.getElementById('root'));
    } else {
      ReactDOM.render(<Login />, document.getElementById('root'));
    }
  })
  .catch(err => {
      ReactDOM.render(<Login />, document.getElementById('root'));
  })
registerServiceWorker();
