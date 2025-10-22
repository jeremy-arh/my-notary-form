import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
    <Header />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6 md:py-16">{children}</main>
    <Footer />
  </div>
);

export default Layout;
