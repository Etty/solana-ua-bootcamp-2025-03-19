pub mod bin {
    pub mod check_balance;
    pub mod generate_keypair;
    pub mod load_keypair;
}

fn main() {
    crate::bin::generate_keypair::main();
    println!("====================================================");
    crate::bin::load_keypair::main();
    println!("====================================================");
    crate::bin::check_balance::main();
}
