import React from "react";
import Alert from "../Alert";

export default class CatchError extends React.Component {
  static getDerivedStateFromError(error) {
    return { error };
  }

  /* eslint-disable react/state-in-constructor */
  state = {
    error: null,
  };

  componentDidCatch(err) {
    console.error(err);
  }

  render() {
    const { error } = this.state;
    // eslint-disable-next-line react/prop-types
    const { children } = this.props;
    if (error) {
      return <Alert message={error.message} />;
    }

    return children;
  }
}
