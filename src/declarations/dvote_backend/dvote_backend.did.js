export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'addCandidate' : IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    'getCandidate' : IDL.Func(
        [IDL.Nat],
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Nat],
        ['query'],
      ),
    'getCountCandidates' : IDL.Func([], [IDL.Int], ['query']),
    'getResults' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text, IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'vote' : IDL.Func([IDL.Text, IDL.Text], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
