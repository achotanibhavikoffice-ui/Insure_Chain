// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 13417495928159013554634867471742921004186954394825051103727995068625925035821;
    uint256 constant alphay  = 2727036668991730969826815602233196288308217441484602099512028697196531634006;
    uint256 constant betax1  = 21021146742474638452053881084935367399365762703177448602436164428296637036482;
    uint256 constant betax2  = 19504933833140007527080604556607782292335559104049300712756488854028327791224;
    uint256 constant betay1  = 15422011131593749062899112699901295068337519326272087605047053905807842912294;
    uint256 constant betay2  = 8976670537562935783093748475430173534561115108880024029709829835864497759364;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 1488195728045945273368709450015439883518924546154792692245076380863875219703;
    uint256 constant deltax2 = 17701656128675439453840710759235765926142928555063780076896227488018755235903;
    uint256 constant deltay1 = 16325874951022317595503634453953081990414082429191904116150449853466208163620;
    uint256 constant deltay2 = 6570138412453195436245398929543542392297840223705933376144500979448965865939;

    
    uint256 constant IC0x = 18983282260312110657801278907743626492945903502168994361776006463371931511744;
    uint256 constant IC0y = 6644393782056972552619825241606513179966631152821812645080763365145264913196;
    
    uint256 constant IC1x = 3452768792679548016341981823250997669654402666333058937393380146536037136553;
    uint256 constant IC1y = 1239426543243083253988988680252532859029080211669691863218003704285349349520;
    
    uint256 constant IC2x = 1649922300167039391152326284127869472916706635299591292416344873563084442453;
    uint256 constant IC2y = 1632196155133803347432235652853836730629699402896637136480720305682889168119;
    
    uint256 constant IC3x = 3624243855414077734801696006033165415327811771656075003153783221496067473179;
    uint256 constant IC3y = 7443752914282246866254329551973351297374846552984061566263879813049599242855;
    
    uint256 constant IC4x = 15473700856966415113628238670645119344023169087966580840981162023589579288607;
    uint256 constant IC4y = 254845653796401429009111500934702311828059382400290961033625909369777854194;
    
    uint256 constant IC5x = 21876517348729807417268169834831433895827918854631113601578647683258239208468;
    uint256 constant IC5y = 8523423901073742269628681823530178268941045580405634024930336164378652721916;
    
    uint256 constant IC6x = 19611159119662329414779481308102184777093812182783107388090704070197722003156;
    uint256 constant IC6y = 14253697547573730026702552500582300055735965259172647660378875846583833780286;
    
    uint256 constant IC7x = 14333105808754533245899586571114973600157504207977904175960303219163489099119;
    uint256 constant IC7y = 13573583152672531691338521612477007050119661493322194363620963121668249319814;
    
    uint256 constant IC8x = 19494552819684290754277605933687289847947627426364772527656858355671371626229;
    uint256 constant IC8y = 5403828539634514528661536167099974280981869404945572540581720628810209122962;
    
    uint256 constant IC9x = 6207625490263474922510330030832877267985201398756672875572315221623095074563;
    uint256 constant IC9y = 1237237402753127393557662711308032014297672621737976749348651322648161017316;
    
    uint256 constant IC10x = 862008249580710662925051819201039963192589050454571745605354271192796387117;
    uint256 constant IC10y = 9615790360295863402771485847961947898735983358076363587302627599026691154781;
    
    uint256 constant IC11x = 15211317419856460461123033908301596102650714978153807514281771995479762689508;
    uint256 constant IC11y = 8146738474423988397419857867722974992819666479069719270977451038070092562199;
    
    uint256 constant IC12x = 3146212159477218531949062433065818183746417884531897311768966722435056548026;
    uint256 constant IC12y = 2493012065462790114162424788803973201352787080094105369429671490684111638967;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[12] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
