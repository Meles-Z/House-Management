import React from 'react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-800 text-white py-10 px-5">
            <div className="container mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-10 lg:space-y-0 lg:space-x-10">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-2xl font-bold">Sell House</h1>
                    <h3 className="text-lg">House Data</h3>
                </div>

                <div className="flex flex-col space-y-4">
                    <div className="flex gap-4">
                        <button className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded">Member</button>
                        <button className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded">(251) 920-227-833</button>
                    </div>
                    <div className="flex gap-4">
                        <a href="#" className="hover:underline">Home</a>
                        <a href="#" className="hover:underline">Product & Service</a>
                        <a href="#" className="hover:underline">About</a>
                        <a href="#" className="hover:underline">Contact</a>
                    </div>
                </div>

                <div className="flex flex-col space-y-2">
                    <h5 className="text-lg">(252) 920-227-833</h5>
                    <h5 className="text-lg">POX Addis Ababa</h5>
                </div>
            </div>
            <div className="text-center mt-10">
                <h4 className="text-lg">Smart Home &copy; {currentYear}</h4>
            </div>
        </footer>
    );
}
