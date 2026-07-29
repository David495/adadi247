import { Mail, MapPin, Phone } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function ContactPage() {
    return (
        <>
            <Navbar/>
    <main className="min-h-screen bg-[#FAF8F6]">

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

        <div className="mb-12 text-center">

          <p className="text-sm font-semibold uppercase tracking-wider text-[#8B1E3F]">
            Contact ADADI
          </p>

          <h1 className="mt-3 text-4xl font-bold text-[#242424]">
            Get in Touch
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Have questions, need support, or want to learn more about ADADI?
            Our team is ready to help.
          </p>

        </div>


        <div className="grid gap-8 lg:grid-cols-2">


          <div className="rounded-2xl border border-[#E8D5DC] bg-white p-8 shadow-sm">

            <h2 className="text-2xl font-bold text-[#242424]">
              Contact Information
            </h2>


            <div className="mt-8 space-y-6">


              <div className="flex gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                  <Mail size={22} />
                </div>

                <div>
                  <p className="font-semibold text-[#242424]">
                    Email
                  </p>

                  <p className="text-gray-600">
                    support@adadi.com
                  </p>
                </div>

              </div>



              <div className="flex gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                  <Phone size={22} />
                </div>

                <div>
                  <p className="font-semibold text-[#242424]">
                    Phone
                  </p>

                  <p className="text-gray-600">
                     +234 810 531 4847
                  </p>
                </div>

              </div>



              <div className="flex gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7E9EE] text-[#8B1E3F]">
                  <MapPin size={22} />
                </div>

                <div>
                  <p className="font-semibold text-[#242424]">
                    Location
                  </p>

                  <p className="text-gray-600">
                    King David University of Medical Sciences,
                    Uburu, Ebonyi State, Nigeria.
                  </p>
                </div>

              </div>


            </div>

          </div>



          <div className="overflow-hidden rounded-2xl border border-[#E8D5DC] bg-white shadow-sm">

            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3967.7399211932525!2d7.717704774748932!3d6.030389093955118!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x10434b136af90b19%3A0xa3c228ddc08cb2bf!2sKing%20David%20University%20of%20Medical%20Sciences%20Uburu!5e0!3m2!1sen!2sng!4v1785349526124!5m2!1sen!2sng"
              className="h-[450px] w-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />

          </div>


        </div>


        <div className="mt-10 rounded-2xl border border-[#E8D5DC] bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-bold text-[#242424]">
            Send Us a Message
          </h2>

          <p className="mt-2 text-gray-600">
            A contact form can be connected here later to send enquiries
            directly to the ADADI support team.
          </p>

        </div>


      </section>

            </main>
            <Footer/>
            </>
  );
}