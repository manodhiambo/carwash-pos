'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Car,
  Bike,
  Sparkles,
  Clock,
  CreditCard,
  Users,
  BarChart3,
  Shield,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Play,
  Star,
  Quote,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
} from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-primary-900">CarWash POS</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-primary">Features</a>
            <a href="#services" className="text-sm font-medium text-gray-600 hover:text-primary">Services</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-primary">Testimonials</a>
            <a href="#contact" className="text-sm font-medium text-gray-600 hover:text-primary">Contact</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                #1 Car Wash Management System in Kenya
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Transform Your
                <span className="text-primary"> Car Wash </span>
                Business Today
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Streamline operations, boost revenue, and delight customers with our
                all-in-one car wash management system. From check-in to payment,
                we've got you covered.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/login">
                  <Button size="xl" className="gap-2">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Button size="xl" variant="outline" className="gap-2">
                  <Play className="h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-gray-600">Active Car Washes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">1M+</div>
                  <div className="text-sm text-gray-600">Vehicles Washed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">99%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
              </div>
            </div>
            <div className="relative">
              {/* Hero Image Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative h-48 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <Car className="h-24 w-24 text-white/80" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                      <span className="text-white text-sm font-medium">Professional Car Wash</span>
                    </div>
                  </div>
                  <div className="relative h-64 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                    <Users className="h-20 w-20 text-white/80" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                      <span className="text-white text-sm font-medium">Happy Customers</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="relative h-64 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <Bike className="h-20 w-20 text-white/80" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                      <span className="text-white text-sm font-medium">Motorbike Cleaning</span>
                    </div>
                  </div>
                  <div className="relative h-48 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-20 w-20 text-white/80" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                      <span className="text-white text-sm font-medium">Premium Detailing</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 animate-bounce">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">M-Pesa Ready</div>
                    <div className="text-xs text-gray-500">Instant Payments</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run a Successful Car Wash
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From vehicle check-in to payment processing, our system handles it all
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Car,
                title: 'Quick Check-In',
                description: 'Register vehicles in seconds with automatic registration lookup and returning customer recognition.',
                color: 'bg-blue-100 text-blue-600',
              },
              {
                icon: Clock,
                title: 'Queue Management',
                description: 'Real-time queue tracking with estimated wait times. Never lose track of a vehicle again.',
                color: 'bg-orange-100 text-orange-600',
              },
              {
                icon: CreditCard,
                title: 'M-Pesa Integration',
                description: 'Accept payments via M-Pesa, cash, or card. STK push for seamless mobile payments.',
                color: 'bg-green-100 text-green-600',
              },
              {
                icon: Users,
                title: 'Customer Management',
                description: 'Build customer profiles, track visit history, and run loyalty programs that keep them coming back.',
                color: 'bg-purple-100 text-purple-600',
              },
              {
                icon: BarChart3,
                title: 'Detailed Reports',
                description: 'Daily, weekly, and monthly reports. Track revenue, popular services, and staff performance.',
                color: 'bg-pink-100 text-pink-600',
              },
              {
                icon: Shield,
                title: 'Cash Control',
                description: 'Opening and closing balances, expense tracking, and variance reports for complete accountability.',
                color: 'bg-cyan-100 text-cyan-600',
              },
            ].map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className={`h-12 w-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Services You Can Offer
            </h2>
            <p className="text-xl text-gray-600">Configure and price services for any vehicle type</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Exterior Wash', price: 'From KES 200', icon: '🚿' },
              { name: 'Interior Cleaning', price: 'From KES 300', icon: '✨' },
              { name: 'Full Service', price: 'From KES 500', icon: '💎' },
              { name: 'Engine Wash', price: 'From KES 400', icon: '🔧' },
              { name: 'Wax & Polish', price: 'From KES 800', icon: '🌟' },
              { name: 'Undercarriage', price: 'From KES 250', icon: '🔩' },
              { name: 'Detailing', price: 'From KES 2,000', icon: '👑' },
              { name: 'Motorbike Wash', price: 'From KES 150', icon: '🏍️' },
            ].map((service, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{service.icon}</div>
                  <h3 className="font-semibold mb-1">{service.name}</h3>
                  <p className="text-sm text-primary font-medium">{service.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Preview */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold">
                Manage Your Car Wash From Anywhere
              </h2>
              <p className="text-xl text-primary-100">
                Access your dashboard, check reports, and manage operations right from your phone.
                Our responsive design works on any device.
              </p>
              <ul className="space-y-4">
                {[
                  'Real-time dashboard on your phone',
                  'Instant payment notifications',
                  'Staff management on the go',
                  'Push notifications for alerts',
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-4 pt-4">
                <Smartphone className="h-12 w-12 text-primary-200" />
                <div>
                  <div className="font-semibold">Works on All Devices</div>
                  <div className="text-sm text-primary-200">Desktop, Tablet & Mobile</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur rounded-3xl p-8">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                  <div className="bg-primary-600 p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400" />
                      <div className="h-3 w-3 rounded-full bg-green-400" />
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Today's Revenue</div>
                        <div className="text-2xl font-bold">KES 45,850</div>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-blue-600 font-medium">Vehicles</div>
                        <div className="text-xl font-bold">47</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-sm text-purple-600 font-medium">In Queue</div>
                        <div className="text-xl font-bold">5</div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="text-sm font-medium mb-2">Recent Activity</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>KAA 123B - Full Wash - Completed</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>KBB 456C - Interior - In Progress</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Loved by Car Wash Owners Across Kenya
            </h2>
            <p className="text-xl text-gray-600">See what our customers have to say</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'James Mwangi',
                role: 'Owner, Prestige Car Wash',
                location: 'Nairobi',
                quote: 'CarWash POS transformed how we run our business. The M-Pesa integration alone has increased our revenue by 30%.',
                rating: 5,
              },
              {
                name: 'Sarah Wanjiku',
                role: 'Manager, Quick Shine Auto Spa',
                location: 'Mombasa',
                quote: 'The queue management feature is a game-changer. Our customers love knowing exactly when their car will be ready.',
                rating: 5,
              },
              {
                name: 'David Ochieng',
                role: 'Owner, Clean Wheels Kenya',
                location: 'Kisumu',
                quote: 'Finally, a system built for Kenyan car washes! The reports help me make better business decisions every day.',
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-primary-200 mb-4" />
                  <p className="text-gray-600 mb-6">{testimonial.quote}</p>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {testimonial.location}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Car Wash?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of car wash businesses already using CarWash POS.
            Start your free trial today - no credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/login">
              <Button size="xl" variant="secondary" className="gap-2">
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button size="xl" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-300 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">CarWash POS</span>
              </div>
              <p className="text-sm">
                The complete car wash management system for modern businesses in Kenya.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <a href="#" className="hover:text-primary transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="hover:text-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="hover:text-primary transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-primary">Features</a></li>
                <li><a href="#" className="hover:text-primary">Pricing</a></li>
                <li><a href="#" className="hover:text-primary">Integrations</a></li>
                <li><a href="#" className="hover:text-primary">Updates</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-primary">Help Center</a></li>
                <li><a href="#" className="hover:text-primary">Documentation</a></li>
                <li><a href="#" className="hover:text-primary">Training</a></li>
                <li><a href="#" className="hover:text-primary">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Nairobi, Kenya
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> +254 700 123 456
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> hello@carwashpos.co.ke
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} CarWash POS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
