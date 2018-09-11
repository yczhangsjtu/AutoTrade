import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import React, { Component } from 'react';

class Login extends Component {
  render() {
    return (
      <div class="row">
        <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
          <form>
            <div class="form-group">
              <label class="form-label" for="username">Username</label>
              <input type="text" class="form-control" id="username" aria-describedby="User Name" placeholder="Username" />
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <input type="password" class="form-control" name="password" id="password" placeholder="Password" />
            </div>
            <div class="form-check">
              <button type="submit" class="btn btn-primary">Submit</button>
            </div>

          </form>
        </div>
      </div>
    )
  }
}

export default Login
