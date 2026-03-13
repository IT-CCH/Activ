import React from "react";
import Routes from "./Routes";
import { AuthProvider } from "./context/AuthContext";

function App() {
  React.useEffect(() => {
    console.log('App mounted and rendering');
    console.log('React version:', React.version);
  }, []);

  return (
    <div id="app-wrapper" style={{ minHeight: '100vh' }}>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </div>
  );
}

export default App;
