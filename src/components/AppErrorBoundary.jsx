import React from 'react'

export default class AppErrorBoundary extends React.Component {
  state={error:null}

  static getDerivedStateFromError(error){return {error}}

  componentDidCatch(error,info){console.error('DROPS page error',error,info.componentStack)}

  render(){
    if(!this.state.error)return this.props.children
    return <main className="app-error" role="alert">
      <div className="app-error-card">
        <span className="app-error-mark">DROPS</span>
        <h1>This page couldn’t load</h1>
        <p>Your saved records are still in this browser. Reload the page to try again, or return to the dashboard.</p>
        <div className="app-error-actions">
          <button onClick={()=>window.location.reload()}>Reload page</button>
          <a href="/">Go to dashboard</a>
        </div>
        <details><summary>Error details</summary><code>{this.state.error.message}</code></details>
      </div>
    </main>
  }
}
