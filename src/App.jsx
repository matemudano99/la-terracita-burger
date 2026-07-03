import "./App.css";
import { Link, Routes, Route } from "react-router-dom";
import { Container, Nav, Navbar } from "react-bootstrap";
import { Home } from "./Home";
import { About } from "./About";

function App() {
  return (
    <div className="">
      <Navbar expand="lg" className="fixed-top bg-body-tertiary shadow">
        <Container>
          <Navbar.Brand>
            <Link to="/" className="navbar-brand text-success fw-semibold">
              Restaurant
            </Link>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav" />
          <Nav className="me-auto justify-content-end w-100">
            <Nav.Link href="/" className="active text-uppercase">
              Home
            </Nav.Link>
            <Nav.Link href="/about" className="active text-uppercase">
              About
            </Nav.Link>
            <Nav.Link href="/menu" className="active text-uppercase">
              Menu
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>
    </div>
  );
}

export default App;
