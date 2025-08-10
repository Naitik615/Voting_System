import Debug "mo:base/Debug";
import Int "mo:base/Int";
import Bool "mo:base/Bool";
import List "mo:base/List";
import Array "mo:base/Array";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Hash "mo:base/Hash";
import Error "mo:base/Error"; 
import Time "mo:base/Time";

actor Voting {

  type Candidate = {
    id: Nat;
    party: Text;
    location: Text;
    voteCount: Nat;
  };
  
  var countCandidates : Nat = 0;
  // var votingStart : ?Int = null;
  // var votingEnd : ?Int = null;

  let candidates = HashMap.HashMap<Nat, Candidate>(10, Nat.equal, Hash.hash);
  // let voters = HashMap.HashMap<Principal, Bool>(10, Principal.equal, Principal.hash);

  public func addCandidate(party: Text, location: Text) : async Nat {
    countCandidates += 1;
    let candidate : Candidate = {
      id = countCandidates;
      party = party;
      location = location;
      voteCount = 0;
    };
    candidates.put(countCandidates, candidate);
    return countCandidates;
  };


  public query func getCandidate(candidateID: Nat) : async (Nat, Text, Text, Nat) {
    switch (candidates.get(candidateID)) {
      case (?c) {
        return (c.id, c.party, c.location, c.voteCount);
      };
      case null {
        throw Error.reject("Candidate not found.");
      };
    };
  };


public func vote(party: Text, location: Text) : async () {
  label search {
  // let caller = Principal.fromText("aaaaa-aa");
  
  // Comment: Check if the user has already voted
  // if (voters.get(caller) == ?true) {
  //   throw Error.reject("You have already voted.");
  // };
  
  // Comment: Mark the user as having voted
  // voters.put(caller, true);
    for ((id, candidate) in candidates.entries()) {
      if (candidate.party == party and candidate.location == location) {
        let updated = {
          id = candidate.id;
          party = candidate.party;
          location = candidate.location;
          voteCount = candidate.voteCount + 1;
        };
        candidates.put(id, updated);
        break search;
      };
    };
    
    // If we reach here, no candidate was found
    throw Error.reject("Candidate with the specified party and location not found.");
  };
};



  public query func getCountCandidates() : async Int {
    return countCandidates;
  };

public query func getResults() : async [(Nat, Text,Text, Nat)] {
  var results : List.List<(Nat, Text, Text , Nat)> = List.nil();

  for ((_, candidate) in candidates.entries()) {
    results := List.push((candidate.id, candidate.party,candidate.location, candidate.voteCount), results);
  };
  
  return List.toArray(results);
}

};