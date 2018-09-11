import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import React, { Component } from 'react';

class Login extends Component {
  render() {
    return (
      <div className="row">
        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
          <form action="/api/login" method="post">
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input type="text" className="form-control" name="username" id="username" aria-describedby="User Name" placeholder="Username" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input type="password" className="form-control" name="password" id="password" placeholder="Password" />
            </div>
            <div className="form-check">
              <button type="submit" className="btn btn-primary">Submit</button>
            </div>

          </form>
        </div>
      </div>
    )
  }
}

export default Login
