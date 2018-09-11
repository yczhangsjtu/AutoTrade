import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from 'react';
import './App.css';

class App extends Component {
  logout() {
    fetch('/api/logout')
  }
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div className="col-md-2 offset-md-10">
            <button className="btn" onClick={() => this.logout()}>Log Out</button>
          </div>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
