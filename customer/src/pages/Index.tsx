import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, QrCode, Store } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8" />
            <h1 className="text-3xl font-bold">BayOrder</h1>
          </div>
          <p className="text-primary-foreground/90 mt-1">Smart QR Ordering System</p>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Seamless Table-Side Ordering
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Scan, order, and enjoy. BayOrder makes restaurant ordering effortless
              with our QR-powered menu system.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="h-12 w-12 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Scan QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Simply scan the code at your table to access the menu
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="h-12 w-12 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Browse & Order</h3>
                <p className="text-sm text-muted-foreground">
                  Add items to cart and place your order instantly
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="h-12 w-12 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Cash Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Pay with cash when your order arrives at the table
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Demo Link */}
          <div className="text-center">
            <Card className="bg-accent border-primary">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Try Demo Order</h3>
                <p className="text-muted-foreground mb-6">
                  Experience the customer ordering interface with sample data
                </p>
                <Link to="/order?cafeId=demo-cafe&tableId=T1">
                  <Button size="lg" className="text-lg px-8">
                    <QrCode className="mr-2 h-5 w-5" />
                    View Demo Menu
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Pixelbay Studios - Powered by QR Technology</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
